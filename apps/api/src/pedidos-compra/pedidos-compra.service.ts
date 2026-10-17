import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, StatusPedido } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { AtualizarPedidoCompraDto } from './dto/atualizar-pedido-compra.dto';
import { CriarPedidoCompraDto } from './dto/criar-pedido-compra.dto';
import { getTenantIdOrFail } from '../database/tenant-context';

@Injectable()
export class PedidosCompraService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly estoque: EstoqueService,
  ) {}

  listar(status?: string) {
    const where: Prisma.PedidoCompraWhereInput = {};
    if (status !== undefined) {
      if (!Object.values(StatusPedido).includes(status as StatusPedido))
        throw new BadRequestException('Situação do pedido inválida');
      where.status = status as StatusPedido;
    }
    return this.prisma.client.pedidoCompra.findMany({
      where,
      include: {
        fornecedor: { select: { nome: true } },
        itens: { include: { produto: { select: { nome: true, sku: true } } } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async criar(dto: CriarPedidoCompraDto) {
    if (!dto.itens?.length) {
      throw new BadRequestException('O pedido deve ter ao menos um item');
    }
    await this.validarReferencias(dto.fornecedorId, dto.itens);
    return this.prisma.client.pedidoCompra.create({
      data: {
        fornecedorId: dto.fornecedorId ?? null,
        observacoes: dto.observacoes ?? null,
        itens: {
          create: dto.itens.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            precoEsperado: i.precoEsperado ?? null,
          })),
        },
      } as Prisma.PedidoCompraUncheckedCreateInput,
      include: { fornecedor: true, itens: true },
    });
  }

  async atualizar(id: string, dto: AtualizarPedidoCompraDto) {
    const pedido = await this.obter(id);
    if (pedido.status !== 'RASCUNHO') {
      throw new UnprocessableEntityException('Somente pedidos em rascunho podem ser editados');
    }
    await this.validarReferencias(dto.fornecedorId, dto.itens);

    const empresaId = getTenantIdOrFail();
    await this.prisma.client.$transaction(async (tx) => {
      // O bloqueio da linha impede envio/cancelamento durante a troca dos itens.
      const claimed = await tx.pedidoCompra.updateMany({
        where: { id, empresaId, status: 'RASCUNHO' },
        data: {
          status: 'RASCUNHO',
          ...(dto.fornecedorId !== undefined ? { fornecedorId: dto.fornecedorId } : {}),
          ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
        },
      });
      if (claimed.count !== 1) throw new ConflictException('Pedido já alterado por outra operação');
      if (dto.itens) {
        await tx.itemPedidoCompra.deleteMany({ where: { pedidoId: id, pedido: { empresaId } } });
        await tx.pedidoCompra.update({
          where: { id, empresaId },
          data: {
            itens: {
              create: dto.itens.map((i) => ({
                produtoId: i.produtoId,
                quantidade: i.quantidade,
                precoEsperado: i.precoEsperado ?? null,
              })),
            },
          },
        });
      }
    });
    return this.obter(id);
  }

  async enviar(id: string) {
    const pedido = await this.obter(id);
    if (pedido.status !== 'RASCUNHO') {
      throw new UnprocessableEntityException('Somente rascunhos podem ser enviados');
    }
    const result = await this.prisma.client.pedidoCompra.updateMany({
      where: { id, empresaId: getTenantIdOrFail(), status: 'RASCUNHO' },
      data: { status: 'ENVIADO' },
    });
    if (result.count !== 1) throw new ConflictException('Pedido já alterado por outra operação');
    return this.obter(id);
  }

  async receber(id: string) {
    const pedido = await this.obter(id);
    if (pedido.status !== 'ENVIADO') {
      throw new UnprocessableEntityException('Somente pedidos enviados podem ser recebidos');
    }
    const empresaId = getTenantIdOrFail();
    await this.prisma.client.$transaction(async (tx) => {
      const claimed = await tx.pedidoCompra.updateMany({
        where: { id, empresaId, status: 'ENVIADO' },
        data: { status: 'RECEBIDO' },
      });
      if (claimed.count !== 1) throw new ConflictException('Pedido já alterado por outra operação');
      for (const item of pedido.itens) {
        await this.estoque.registrarEntradaTx(
          tx as unknown as Prisma.TransactionClient,
          item.produtoId,
          item.quantidade,
          `Pedido #${id}`,
        );
      }
    });
    return this.obter(id);
  }

  async cancelar(id: string) {
    const pedido = await this.obter(id);
    if (pedido.status === 'RECEBIDO') {
      throw new UnprocessableEntityException('Pedido já recebido não pode ser cancelado');
    }
    const result = await this.prisma.client.pedidoCompra.updateMany({
      where: {
        id,
        empresaId: getTenantIdOrFail(),
        status: { in: ['RASCUNHO', 'ENVIADO', 'CANCELADO'] },
      },
      data: { status: 'CANCELADO' },
    });
    if (result.count !== 1) throw new ConflictException('Pedido já alterado por outra operação');
    return this.obter(id);
  }

  async sugestao() {
    const produtos = await this.prisma.client.produto.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, estoqueAtual: true, estoqueMinimo: true },
    });
    return produtos
      .filter((p) => p.estoqueAtual < p.estoqueMinimo)
      .map((p) => ({
        produtoId: p.id,
        nome: p.nome,
        estoqueAtual: p.estoqueAtual,
        estoqueMinimo: p.estoqueMinimo,
        quantidadeSugerida: p.estoqueMinimo - p.estoqueAtual + 5,
      }));
  }

  async obter(id: string) {
    const pedido = await this.prisma.client.pedidoCompra.findFirst({
      where: { id },
      include: { fornecedor: true, itens: true },
    });
    if (!pedido) throw new NotFoundException('Pedido de compra não encontrado');
    return pedido;
  }

  private async validarReferencias(fornecedorId?: string | null, itens?: { produtoId: string }[]) {
    if (fornecedorId) {
      const fornecedor = await this.prisma.client.fornecedor.findFirst({
        where: { id: fornecedorId, ativo: true },
        select: { id: true },
      });
      if (!fornecedor) throw new NotFoundException('Fornecedor não encontrado');
    }
    if (!itens) return;
    if (itens.length === 0) throw new BadRequestException('O pedido deve ter ao menos um item');
    const ids = [...new Set(itens.map((item) => item.produtoId))];
    const produtos = await this.prisma.client.produto.findMany({
      where: { id: { in: ids }, ativo: true },
      select: { id: true },
    });
    if (produtos.length !== ids.length) throw new NotFoundException('Produto não encontrado');
  }
}
