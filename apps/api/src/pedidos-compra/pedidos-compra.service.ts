import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, StatusPedido } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { AtualizarPedidoCompraDto } from './dto/atualizar-pedido-compra.dto';
import { CriarPedidoCompraDto } from './dto/criar-pedido-compra.dto';

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
    for (const item of pedido.itens) {
      await this.estoque.registrarEntrada(item.produtoId, item.quantidade, `Pedido #${id}`);
    }
    return this.prisma.client.pedidoCompra.update({
      where: { id },
      data: { status: 'RECEBIDO' },
    });
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
}
