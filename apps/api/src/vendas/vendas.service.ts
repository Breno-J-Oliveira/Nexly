import { createHash } from 'node:crypto';
import { saleDateFilter } from './sale-date-filter';
import { entradaFilial, saidaFilial } from '../gestao/unidade-estoque';
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
    opcoes?: {
      formaPagamento?: string;
      desconto?: number;
      cupomCodigo?: string;
      filialId?: string;
      recebido?: boolean;
      chaveOperacao?: string;
    },
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
      if (!Number.isSafeInteger(quantidade) || quantidade > 1000000)
        throw new BadRequestException(
          'Quantidade inválida. Use até um milhão de unidades por produto',
        );
      consolidated.set(item.produtoId, { produtoId: item.produtoId, quantidade });
    }
    itens = [...consolidated.values()].sort((a, b) => a.produtoId.localeCompare(b.produtoId));
    const requisicaoHash = createHash('sha256')
      .update(
        JSON.stringify({
          clienteId: clienteId ?? null,
          itens,
          filialId: opcoes?.filialId ?? null,
          recebido: opcoes?.recebido ?? false,
          formaPagamento: opcoes?.formaPagamento ?? null,
          desconto: opcoes?.desconto ?? 0,
          cupomCodigo: opcoes?.cupomCodigo ?? null,
        }),
      )
      .digest('hex');
    if (opcoes?.chaveOperacao) {
      const anterior = await this.prisma.client.venda.findFirst({
        where: { empresaId, chaveOperacao: opcoes.chaveOperacao },
      });
      if (anterior) {
        if (anterior.requisicaoHash !== requisicaoHash)
          throw new ConflictException('A identificação da venda já foi utilizada com outros itens');
        return this.obter(anterior.id);
      }
    }
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
      if (!opcoes?.filialId && produto.estoqueAtual < item.quantidade) {
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
    if (total.greaterThan('99999999.99') || descontoTotal.greaterThan('99999999.99')) {
      throw new BadRequestException('O valor da venda excede o limite permitido');
    }

    // 4-8. Transação: cria venda + itens + baixa de estoque + incrementa cupom.
    const venda = await this.prisma.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM empresas WHERE id=${empresaId} FOR UPDATE`;
      if (opcoes?.chaveOperacao) {
        const anterior = await tx.venda.findFirst({
          where: { empresaId, chaveOperacao: opcoes.chaveOperacao },
        });
        if (anterior) {
          if (anterior.requisicaoHash !== requisicaoHash)
            throw new ConflictException(
              'A identificação da venda já foi utilizada com outros itens',
            );
          return anterior;
        }
      }

      const v = await tx.venda.create({
        data: {
          empresaId,
          ...(opcoes?.chaveOperacao ? { chaveOperacao: opcoes.chaveOperacao, requisicaoHash } : {}),
          clienteId,
          cupomId: cupom?.id ?? null,
          total,
          formaPagamento: opcoes?.formaPagamento || undefined,
          desconto: descontoTotal,
          ...(opcoes?.filialId ? { filialId: opcoes.filialId } : {}),
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
            custoUnitario: produto?.custoAtual ?? null,
          },
        });
        if (opcoes?.filialId)
          await saidaFilial(
            tx as unknown as Prisma.TransactionClient,
            empresaId,
            opcoes.filialId,
            item.produtoId,
            item.quantidade,
            `Venda #${v.id}`,
          );
        else
          await this.estoqueService.registrarSaidaTx(
            tx as unknown as Tx,
            item.produtoId,
            item.quantidade,
            `Venda #${v.id}`,
          );
      }

      const conta = await tx.lancamentoFinanceiro.create({
        data: {
          empresaId,
          filialId: opcoes?.filialId,
          vendaId: v.id,
          tipo: 'RECEITA',
          categoria: 'VENDAS',
          descricao: `Venda #${v.id}`,
          valor: total,
          valorPago: opcoes?.recebido ? total : 0,
          status: total.isZero() || opcoes?.recebido ? 'PAGO' : 'ABERTO',
          vencimento: v.createdAt,
        },
      });
      if (opcoes?.recebido && !total.isZero())
        await tx.baixaFinanceira.create({
          data: { lancamentoId: conta.id, chave: `venda:${v.id}`, valor: total },
        });

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

  async estornar(id: string, motivo: string, usuarioId: string) {
    const empresaId = getTenantIdOrFail();
    return this.prisma.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM empresas WHERE id=${empresaId} FOR UPDATE`;
      const venda = await tx.venda.findFirst({
        where: { id, empresaId },
        include: { itens: true },
      });
      if (!venda) throw new NotFoundException('Venda não encontrada');
      if (venda.status === 'ESTORNADA') return venda;
      await tx.venda.update({
        where: { id },
        data: {
          status: 'ESTORNADA',
          estornadaEm: new Date(),
          motivoEstorno: motivo,
          estornadaPor: usuarioId,
        },
      });
      for (const item of [...venda.itens].sort((a, b) => a.produtoId.localeCompare(b.produtoId))) {
        if (venda.filialId)
          await entradaFilial(
            tx as unknown as Prisma.TransactionClient,
            empresaId,
            venda.filialId,
            item.produtoId,
            item.quantidade,
            `Estorno da venda ${id}`,
          );
        else {
          const changed = await tx.produto.updateMany({
            where: { id: item.produtoId, empresaId },
            data: { estoqueAtual: { increment: item.quantidade } },
          });
          if (changed.count !== 1)
            throw new ConflictException('Produto da venda indisponível para reposição');
          await tx.movimentacaoEstoque.create({
            data: {
              empresaId,
              produtoId: item.produtoId,
              tipo: 'ENTRADA',
              quantidade: item.quantidade,
              motivo: `Estorno da venda ${id}`,
            },
          });
        }
      }
      if (venda.cupomId)
        await tx.cupom.updateMany({
          where: { id: venda.cupomId, empresaId, usoAtual: { gt: 0 } },
          data: { usoAtual: { decrement: 1 } },
        });
      const conta = await tx.lancamentoFinanceiro.findFirst({ where: { vendaId: id, empresaId } });
      if (conta) {
        await tx.lancamentoFinanceiro.update({
          where: { id: conta.id },
          data: { status: 'CANCELADO', valorPago: 0 },
        });
        await tx.baixaFinanceira.updateMany({
          where: { lancamentoId: conta.id, estornada: false },
          data: { estornada: true, estornadaEm: new Date() },
        });
      }
      if (venda.clienteId) {
        const [compras, ultimaVenda, ultimaVisita] = await Promise.all([
          tx.venda.aggregate({
            where: { empresaId, clienteId: venda.clienteId, status: 'CONCLUIDA' },
            _sum: { total: true },
          }),
          tx.venda.findFirst({
            where: { empresaId, clienteId: venda.clienteId, status: 'CONCLUIDA' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          }),
          tx.agendamento.findFirst({
            where: { empresaId, clienteId: venda.clienteId, status: 'CONCLUIDO' },
            orderBy: { dataHora: 'desc' },
            select: { dataHora: true },
          }),
        ]);
        const datas = [ultimaVenda?.createdAt, ultimaVisita?.dataHora].filter(Boolean) as Date[];
        await tx.cliente.updateMany({
          where: { id: venda.clienteId, empresaId },
          data: {
            totalGasto: compras._sum.total ?? 0,
            ultimaVisita: datas.length
              ? new Date(Math.max(...datas.map((d) => d.getTime())))
              : null,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          empresaId,
          usuarioId,
          acao: 'EDITAR',
          recurso: 'Vendas',
          recursoId: id,
          dadosAntigos: { status: venda.status },
          dadosNovos: { status: 'ESTORNADA', motivo },
        },
      });
      return tx.venda.findFirst({ where: { id, empresaId }, include: { itens: true } });
    });
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
    const createdAt = saleDateFilter(filtros.dataInicio, filtros.dataFim);
    const where: Prisma.VendaWhereInput = {
      empresaId: getTenantIdOrFail(),
      ...(filtros.clienteId ? { clienteId: filtros.clienteId } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const [data, aggregate, items, receita] = await Promise.all([
      this.prisma.client.venda.findMany({
        where,
        include: {
          cliente: { select: { id: true, nome: true } },
          itens: { include: { produto: { select: { id: true, nome: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.client.venda.aggregate({ where, _sum: { total: true }, _count: { _all: true } }),
      this.prisma.client.itemVenda.aggregate({
        where: { venda: { ...where, status: 'CONCLUIDA' } },
        _sum: { quantidade: true },
      }),
      this.prisma.client.venda.aggregate({
        where: { ...where, status: 'CONCLUIDA' },
        _sum: { total: true },
      }),
    ]);
    return {
      data,
      total: aggregate._count._all,
      page,
      limit,
      resumo: {
        totalVendido: Number(receita._sum.total ?? 0),
        totalItens: items._sum.quantidade ?? 0,
      },
    };
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
