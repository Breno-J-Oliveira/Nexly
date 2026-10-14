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
    if (status) {
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

    if (dto.itens) {
      await this.prisma.client.itemPedidoCompra.deleteMany({ where: { pedidoId: id } });
      await this.prisma.client.pedidoCompra.update({
        where: { id },
        data: {
          ...(dto.fornecedorId !== undefined ? { fornecedorId: dto.fornecedorId } : {}),
          ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
          itens: {
            create: dto.itens.map((i) => ({
              produtoId: i.produtoId,
              quantidade: i.quantidade,
              precoEsperado: i.precoEsperado ?? null,
            })),
          },
        },
      });
    } else {
      await this.prisma.client.pedidoCompra.update({
        where: { id },
        data: {
          ...(dto.fornecedorId !== undefined ? { fornecedorId: dto.fornecedorId } : {}),
          ...(dto.observacoes !== undefined ? { observacoes: dto.observacoes } : {}),
        },
      });
    }
    return this.obter(id);
  }

  async enviar(id: string) {
    const pedido = await this.obter(id);
    if (pedido.status !== 'RASCUNHO') {
      throw new UnprocessableEntityException('Somente rascunhos podem ser enviados');
    }
    return this.prisma.client.pedidoCompra.update({
      where: { id },
      data: { status: 'ENVIADO' },
    });
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
    return this.prisma.client.pedidoCompra.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
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
