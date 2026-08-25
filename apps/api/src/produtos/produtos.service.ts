import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';
import { CriarProdutoDto } from './dto/criar-produto.dto';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(
    page: number,
    limit: number,
    filtros: { categoria?: string; search?: string; estoqueAbaixoDe?: number },
  ) {
    const where: Prisma.ProdutoWhereInput = {
      ativo: true,
      ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
      ...(filtros.estoqueAbaixoDe !== undefined
        ? { estoqueAtual: { lt: filtros.estoqueAbaixoDe } }
        : {}),
      ...(filtros.search
        ? {
            OR: [
              { nome: { contains: filtros.search, mode: 'insensitive' } },
              { sku: { contains: filtros.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.produto.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.client.produto.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async obter(id: string) {
    const produto = await this.prisma.client.produto.findFirst({
      where: { id, ativo: true },
      include: {
        movimentacoes: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    return produto;
  }

  async criar(dto: CriarProdutoDto) {
    try {
      return await this.prisma.client.produto.create({
        data: {
          nome: dto.nome,
          sku: dto.sku,
          preco: dto.preco,
          estoqueAtual: dto.estoqueAtual ?? 0,
          estoqueMinimo: dto.estoqueMinimo ?? 5,
          categoria: dto.categoria,
        } as Prisma.ProdutoUncheckedCreateInput,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um produto com esse SKU');
      }
      throw error;
    }
  }

  async atualizar(id: string, dto: AtualizarProdutoDto) {
    await this.obter(id);
    await this.prisma.client.produto.updateMany({
      where: { id },
      data: {
        nome: dto.nome,
        preco: dto.preco,
        estoqueMinimo: dto.estoqueMinimo,
        categoria: dto.categoria,
      },
    });
    return this.obter(id);
  }

  async desativar(id: string) {
    await this.obter(id);

    const emUso = await this.prisma.client.insumoServico.findFirst({
      where: { produtoId: id, servico: { ativo: true } },
    });
    if (emUso) {
      throw new ConflictException('Não é possível desativar: produto é insumo de um serviço ativo');
    }

    await this.prisma.client.produto.updateMany({
      where: { id },
      data: { ativo: false },
    });
    return { success: true };
  }
}
