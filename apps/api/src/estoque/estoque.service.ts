import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getTenantContext } from '../database/tenant-context';
import { PrismaService } from '../database/prisma.service';

export type Tx = Prisma.TransactionClient;

/**
 * Motor central de movimentação de estoque.
 *
 * Nenhuma outra parte do sistema altera `estoqueAtual` diretamente —
 * toda entrada/saída passa por aqui, garantindo atomicidade e auditoria.
 *
 * As variantes `*Tx` operam sobre um transaction client fornecido,
 * permitindo que o motor do PDV (`VendasService`) reutilize a lógica
 * dentro de uma transação única.
 *
 * IMPORTANTE: o transaction client do Prisma **não** passa pela Prisma
 * Extension. As variantes `*Tx` leem o `empresaId` do `AsyncLocalStorage`
 * (`getTenantContext()`) e gravam-no explicitamente no `data` para manter
 * o isolamento multi-tenant.
 */
@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra uma ENTRADA de estoque (compra de fornecedor, devolução etc.)
   * numa transação atômica.
   *
   * @param produtoId - ID do produto (do tenant atual).
   * @param quantidade - Quantidade a adicionar (> 0).
   * @param motivo - Descrição para auditoria (ex: "Compra fornecedor X").
   * @throws BadRequestException se quantidade <= 0.
   */
  async registrarEntrada(produtoId: string, quantidade: number, motivo: string): Promise<void> {
    await this.prisma.client.$transaction((tx) =>
      this.registrarEntradaTx(tx as unknown as Tx, produtoId, quantidade, motivo),
    );
  }

  /**
   * Variante de `registrarEntrada` que opera dentro de uma transação existente.
   * Usado por `VendasService` no caminho de saída por venda.
   */
  async registrarEntradaTx(
    tx: Tx,
    produtoId: string,
    quantidade: number,
    motivo: string,
  ): Promise<void> {
    if (quantidade <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero');
    }

    const empresaId = this.tenantIdOrFail();
    await tx.produto.updateMany({
      where: { id: produtoId },
      data: { estoqueAtual: { increment: quantidade } },
    });
    await tx.movimentacaoEstoque.create({
      data: { produtoId, tipo: 'ENTRADA', quantidade, motivo, empresaId },
    });
  }

  /**
   * Registra uma SAÍDA de estoque (venda, consumo em serviço etc.)
   * numa transação atômica.
   *
   * O decremento é atômico: só é aplicado se houver saldo suficiente
   * (`estoqueAtual >= quantidade`). Caso contrário, lança `ConflictException`
   * e nenhum registro é criado.
   *
   * @param agendamentoId - Opcional. Quando a saída é o resultado da
   *   baixa automática ao concluir um atendimento, este campo vincula
   *   a movimentação ao agendamento para rastreabilidade.
   */
  async registrarSaida(
    produtoId: string,
    quantidade: number,
    motivo: string,
    agendamentoId?: string,
  ): Promise<void> {
    await this.prisma.client.$transaction((tx) =>
      this.registrarSaidaTx(tx as unknown as Tx, produtoId, quantidade, motivo, agendamentoId),
    );
  }

  /**
   * Variante de `registrarSaida` para uso dentro de uma transação existente.
   */
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

    const empresaId = this.tenantIdOrFail();
    // Decremento atômico: só aplica se houver saldo suficiente.
    const result = await tx.produto.updateMany({
      where: { id: produtoId, estoqueAtual: { gte: quantidade } },
      data: { estoqueAtual: { decrement: quantidade } },
    });

    if (result.count === 0) {
      throw new ConflictException('Saldo insuficiente em estoque');
    }

    await tx.movimentacaoEstoque.create({
      data: { produtoId, tipo: 'SAIDA', quantidade, motivo, agendamentoId, empresaId },
    });
  }

  /**
   * Verifica se há saldo suficiente para uma venda/saída sem realizá-la.
   * Útil para o frontend validar antes de submeter o PDV.
   */
  async verificarSaldo(produtoId: string, quantidadeNecessaria: number): Promise<boolean> {
    const produto = await this.prisma.client.produto.findFirst({ where: { id: produtoId } });
    if (!produto) return false;
    return produto.estoqueAtual >= quantidadeNecessaria;
  }

  /**
   * Retorna o histórico de movimentações de um produto (mais recente primeiro).
   * Útil para auditoria e para a tela de detalhes do produto.
   */
  async historico(produtoId: string) {
    return this.prisma.client.movimentacaoEstoque.findMany({
      where: { produtoId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Agregado de estoque para o dashboard: total de produtos, valor total,
   * lista de produtos críticos (abaixo do mínimo) e zerados.
   *
   * @returns Resumo com totais e lista de produtos que precisam de atenção.
   */
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

  /**
   * Lê o `empresaId` do contexto (AsyncLocalStorage). Lança erro
   * descritivo se não estiver definido — sinaliza bug, não falha
   * de runtime esperada.
   */
  private tenantIdOrFail(): string {
    const empresaId = getTenantContext()?.tenantId;
    if (!empresaId) {
      throw new InternalServerErrorException('Contexto de tenant não definido');
    }
    return empresaId;
  }
}
