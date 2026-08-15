import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
// Removed Prisma import
import { PrismaService } from '../database/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tx = any;

/**
 * Motor central de movimentação de estoque.
 * Nenhuma outra parte do sistema altera `estoqueAtual` diretamente —
 * toda entrada/saída passa por aqui, garantindo atomicidade e auditoria.
 *
 * As variantes `*Tx` operam sobre um transaction client fornecido,
 * permitindo que o motor do PDV (VendasService) reutilize a lógica
 * dentro de uma transação única.
 */
@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  async registrarEntrada(produtoId: string, quantidade: number, motivo: string): Promise<void> {
    await this.prisma.client.$transaction((tx) =>
      this.registrarEntradaTx(tx, produtoId, quantidade, motivo),
    );
  }

  async registrarEntradaTx(
    tx: Tx,
    produtoId: string,
    quantidade: number,
    motivo: string,
  ): Promise<void> {
    if (quantidade <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero');
    }

    await tx.produto.updateMany({
      where: { id: produtoId },
      data: { estoqueAtual: { increment: quantidade } },
    });
    await tx.movimentacaoEstoque.create({
      data: { produtoId, tipo: 'ENTRADA', quantidade, motivo, empresaId: '' },
    });
  }

  async registrarSaida(
    produtoId: string,
    quantidade: number,
    motivo: string,
    agendamentoId?: string,
  ): Promise<void> {
    await this.prisma.client.$transaction((tx) =>
      this.registrarSaidaTx(tx, produtoId, quantidade, motivo, agendamentoId),
    );
  }

  async registrarSaidaTx(
    tx: Tx,
    produtoId: string,
    quantidade: number,
    motivo: string,
    agendamentoId?: string,
  ): Promise<void> {
    if (quantidade <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero');
    }

    // Decremento atômico: só aplica se houver saldo suficiente.
    const result = await tx.produto.updateMany({
      where: { id: produtoId, estoqueAtual: { gte: quantidade } },
      data: { estoqueAtual: { decrement: quantidade } },
    });

    if (result.count === 0) {
      throw new ConflictException('Saldo insuficiente em estoque');
    }

    await tx.movimentacaoEstoque.create({
      data: { produtoId, tipo: 'SAIDA', quantidade, motivo, agendamentoId, empresaId: '' },
    });
  }

  async verificarSaldo(produtoId: string, quantidadeNecessaria: number): Promise<boolean> {
    const produto = await this.prisma.client.produto.findFirst({ where: { id: produtoId } });
    if (!produto) return false;
    return produto.estoqueAtual >= quantidadeNecessaria;
  }

  async historico(produtoId: string) {
    return this.prisma.client.movimentacaoEstoque.findMany({
      where: { produtoId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resumo() {
    const produtos = await this.prisma.client.produto.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, estoqueAtual: true, estoqueMinimo: true, preco: true },
    });

    const totalProdutos = produtos.length;
    const produtosZerados = produtos.filter((p) => p.estoqueAtual === 0).length;
    const produtosCriticos = produtos
      .filter((p) => p.estoqueAtual > 0 && p.estoqueAtual < p.estoqueMinimo)
      .map((p) => ({ id: p.id, nome: p.nome, estoqueAtual: p.estoqueAtual }));
    const produtosAbaixoDoMinimo = produtosCriticos.length + produtosZerados;
    const valorTotalEstoque = produtos.reduce(
      (acc, p) => acc + p.estoqueAtual * Number(p.preco),
      0,
    );

    return {
      totalProdutos,
      produtosZerados,
      produtosAbaixoDoMinimo,
      valorTotalEstoque,
      produtosCriticos,
    };
  }
}
