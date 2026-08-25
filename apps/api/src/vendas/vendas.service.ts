import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService, Tx } from '../estoque/estoque.service';
import { ItemVendaDto } from './dto/criar-venda.dto';

@Injectable()
export class VendasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
  ) {}

  /**
   * Motor do PDV: orquestra a criação de uma venda completa em uma única
   * transação. Se qualquer etapa falhar, o rollback é automático — o
   * estoque não é alterado e a venda não é criada.
   */
  async criar(clienteId: string | undefined, itens: ItemVendaDto[]) {
    if (itens.length === 0) {
      throw new BadRequestException('A venda deve ter ao menos um item');
    }

    const idsUnicos = [...new Set(itens.map((i) => i.produtoId))];
    const produtos = await this.prisma.client.produto.findMany({
      where: { id: { in: idsUnicos }, ativo: true },
    });
    const produtoMap = new Map(produtos.map((p) => [p.id, p]));

    // 1. Valida que todos os produtos existem e têm saldo suficiente.
    for (const item of itens) {
      const produto = produtoMap.get(item.produtoId);
      if (!produto) {
        throw new NotFoundException('Produto não encontrado');
      }
      if (produto.estoqueAtual < item.quantidade) {
        throw new ConflictException(`Saldo insuficiente para "${produto.nome}"`);
      }
    }

    // 2. Calcula o total com base nos preços atuais.
    const total = itens.reduce((acc, item) => {
      const produto = produtoMap.get(item.produtoId);
      return acc + Number(produto?.preco ?? 0) * item.quantidade;
    }, 0);

    // 3-7. Transação: cria venda + itens + baixa de estoque (rollback em falha).
    const venda = await this.prisma.client.$transaction(async (tx) => {
      const v = await tx.venda.create({
        data: { clienteId, total } as Prisma.VendaUncheckedCreateInput,
      });

      for (const item of itens) {
        const produto = produtoMap.get(item.produtoId);
        await tx.itemVenda.create({
          data: {
            vendaId: v.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: produto?.preco ?? 0,
          } as Prisma.ItemVendaUncheckedCreateInput,
        });
        await this.estoqueService.registrarSaidaTx(
          tx as unknown as Tx,
          item.produtoId,
          item.quantidade,
          `Venda #${v.id}`,
        );
      }

      return v;
    });

    return this.obter(venda.id);
  }

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
