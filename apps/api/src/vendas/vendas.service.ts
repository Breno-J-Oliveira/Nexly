import { registrarCompraClienteTx } from '../clientes/cliente-activity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService, Tx } from '../estoque/estoque.service';
import { ItemVendaDto } from './dto/criar-venda.dto';
import { getTenantIdOrFail } from '../database/tenant-context';

/**
 * Motor do PDV: orquestra a criação de uma venda completa em uma única
 * transação, integrando Venda, ItemVenda, MovimentacaoEstoque e Produto.
 *
 * Se qualquer etapa falhar (ex: perda de corrida no estoque, FK inválida),
 * o rollback é automático — o estoque não é alterado e a venda não é criada.
 */
@Injectable()
export class VendasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
  ) {}

  /**
   * Cria uma venda completa a partir dos itens do PDV.
   *
   * Fluxo:
   *  1. Valida todos os produtos (existem? há saldo?).
   *  2. Calcula o total com os preços **atuais** do banco.
   *  3. Em uma única transação:
   *     a. Cria a Venda.
   *     b. Cria cada ItemVenda com o preço unitário congelado.
   *     c. Chama `EstoqueService.registrarSaidaTx` para baixar o estoque
   *        e registrar a MovimentacaoEstoque.
   *
   * @param clienteId - Opcional. Quando `null`, é uma venda avulsa.
   * @param itens - Lista de `{ produtoId, quantidade }`. Pode repetir
   *   o mesmo produto (cada item é uma linha no `ItemVenda`).
   * @returns A venda criada com `itens` e `cliente` carregados.
   * @throws BadRequestException se `itens` estiver vazio.
   * @throws NotFoundException se algum produto não existir.
   * @throws ConflictException se algum produto não tiver saldo suficiente.
   */
  async criar(
    clienteId: string | undefined,
    itens: ItemVendaDto[],
    opcoes?: { formaPagamento?: string; desconto?: number; cupomCodigo?: string },
  ) {
    if (itens.length === 0) {
      throw new BadRequestException('A venda deve ter ao menos um item');
    }
    const empresaId = getTenantIdOrFail();
    const consolidated = new Map<string, ItemVendaDto>();
    for (const item of itens) {
      if (!Number.isSafeInteger(item.quantidade) || item.quantidade <= 0) {
        throw new BadRequestException('Quantidade deve ser um inteiro positivo');
      }
      const quantidade = (consolidated.get(item.produtoId)?.quantidade ?? 0) + item.quantidade;
      if (!Number.isSafeInteger(quantidade)) throw new BadRequestException('Quantidade inválida');
      consolidated.set(item.produtoId, { produtoId: item.produtoId, quantidade });
    }
    itens = [...consolidated.values()];
    if (clienteId) {
      const cliente = await this.prisma.client.cliente.findFirst({
        where: { id: clienteId, empresaId, ativo: true },
        select: { id: true },
      });
      if (!cliente) throw new NotFoundException('Cliente não encontrado');
    }

    // 1. Valida o cupom (se informado) antes de calcular o total.
    let cupom: {
      id: string;
      tipo: 'PERCENTUAL' | 'FIXO';
      valor: number;
      usoAtual: number;
      usoMaximo: number | null;
    } | null = null;
    if (opcoes?.cupomCodigo) {
      const c = await this.prisma.client.cupom.findFirst({
        where: { codigo: opcoes.cupomCodigo },
      });
      if (!c || !c.ativo) {
        throw new UnprocessableEntityException('Cupom inválido ou inativo');
      }
      if (c.validade && c.validade < new Date()) {
        throw new UnprocessableEntityException('Cupom expirado');
      }
      if (c.usoMaximo !== null && c.usoAtual >= c.usoMaximo) {
        throw new UnprocessableEntityException('Cupom esgotado');
      }
      cupom = {
        id: c.id,
        tipo: c.tipo,
        valor: Number(c.valor),
        usoAtual: c.usoAtual,
        usoMaximo: c.usoMaximo,
      };
    }

    const idsUnicos = [...new Set(itens.map((i) => i.produtoId))];
    const produtos = await this.prisma.client.produto.findMany({
      where: { id: { in: idsUnicos }, ativo: true },
    });
    const produtoMap = new Map(produtos.map((p) => [p.id, p]));

    // 2. Valida que todos os produtos existem e têm saldo suficiente.
    for (const item of itens) {
      const produto = produtoMap.get(item.produtoId);
      if (!produto) {
        throw new NotFoundException('Produto não encontrado');
      }
      if (produto.estoqueAtual < item.quantidade) {
        throw new ConflictException(`Saldo insuficiente para "${produto.nome}"`);
      }
    }

    // 3. Calcula o total com base nos preços atuais + descontos (manual + cupom).
    const totalBruto = itens.reduce((acc, item) => {
      const produto = produtoMap.get(item.produtoId);
      return acc.plus(new Prisma.Decimal(produto?.preco ?? 0).times(item.quantidade));
    }, new Prisma.Decimal(0));
    const descontoManual = new Prisma.Decimal(opcoes?.desconto ?? 0);
    if (!descontoManual.isFinite() || descontoManual.isNegative())
      throw new BadRequestException('Desconto inválido');
    const descontoCupom = cupom
      ? cupom.tipo === 'PERCENTUAL'
        ? totalBruto.times(cupom.valor).div(100)
        : cupom.valor
      : 0;
    const descontoTotal = Prisma.Decimal.min(
      descontoManual.plus(descontoCupom),
      totalBruto,
    ).toDecimalPlaces(2);
    const total = totalBruto.minus(descontoTotal).toDecimalPlaces(2);

    // 4-8. Transação: cria venda + itens + baixa de estoque + incrementa cupom.
    const venda = await this.prisma.client.$transaction(async (tx) => {
      const v = await tx.venda.create({
        data: {
          empresaId,
          clienteId,
          cupomId: cupom?.id ?? null,
          total,
          formaPagamento: opcoes?.formaPagamento || undefined,
          desconto: descontoTotal,
        },
      });

      for (const item of itens) {
        const produto = produtoMap.get(item.produtoId);
        await tx.itemVenda.create({
          data: {
            vendaId: v.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: produto?.preco ?? 0,
          },
        });
        await this.estoqueService.registrarSaidaTx(
          tx as unknown as Tx,
          item.produtoId,
          item.quantidade,
          `Venda #${v.id}`,
        );
      }

      if (cupom) {
        const claimed = await tx.cupom.updateMany({
          where: {
            id: cupom.id,
            empresaId,
            ativo: true,
            usoAtual: cupom.usoAtual,
            OR: [{ validade: null }, { validade: { gt: new Date() } }],
          },
          data: { usoAtual: { increment: 1 } },
        });
        if (claimed.count !== 1)
          throw new ConflictException('Cupom alterado por outra venda. Tente novamente.');
      }

      if (clienteId)
        await registrarCompraClienteTx(
          tx as unknown as Prisma.TransactionClient,
          empresaId,
          clienteId,
          total,
          v.createdAt,
        );
      return v;
    });

    return this.obter(venda.id);
  }

  /**
   * Lista vendas com paginação e filtros opcionais.
   *
   * @param page - Página (1-indexed).
   * @param limit - Quantidade por página.
   * @param filtros.dataInicio - ISO 8601. Vendas criadas a partir desta data.
   * @param filtros.dataFim - ISO 8601. Vendas criadas até esta data.
   * @param filtros.clienteId - Filtra vendas de um cliente específico.
   * @returns `{ data, total, page, limit }` ordenado por `createdAt desc`.
   */
  async listar(
    page: number,
    limit: number,
    filtros: { dataInicio?: string; dataFim?: string; clienteId?: string },
  ) {
    const where: Prisma.VendaWhereInput = {
      ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
      ...(filtros.dataInicio || filtros.dataFim
        ? {
            createdAt: {
              ...(filtros.dataInicio ? { gte: new Date(filtros.dataInicio) } : {}),
              ...(filtros.dataFim ? { lte: new Date(filtros.dataFim) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.venda.findMany({
        where,
        include: { cliente: true, itens: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.venda.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Retorna uma venda específica com cliente e itens (cada item com produto).
   * @throws NotFoundException se a venda não existir no tenant.
   */
  async obter(id: string) {
    const venda = await this.prisma.client.venda.findFirst({
      where: { id },
      include: { cliente: true, itens: { include: { produto: true } } },
    });
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }
    return venda;
  }
}
