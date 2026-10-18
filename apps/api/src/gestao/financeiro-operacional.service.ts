import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { dateRange } from '../common/validation/date-range';
import { BaixaDto, LancamentoDto } from './gestao.dto';

@Injectable()
export class FinanceiroOperacionalService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: string, inicio: string, fim: string, filialId?: string, pagina = 1) {
    if (!Number.isInteger(pagina) || pagina < 1 || pagina > 100000)
      throw new BadRequestException('Página inválida');
    const range = dateRange(inicio, fim);
    const where = {
      empresaId,
      vencimento: { gte: range.inicio, lte: range.fim },
      ...(filialId ? { filialId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.client.lancamentoFinanceiro.findMany({
        where,
        orderBy: [{ vencimento: 'asc' }, { id: 'asc' }],
        take: 50,
        skip: (pagina - 1) * 50,
        include: { baixas: { orderBy: { data: 'desc' } } },
      }),
      this.prisma.client.lancamentoFinanceiro.count({ where }),
    ]);
    return { data, total, limit: 50, pagina };
  }
  async criar(empresaId: string, dto: LancamentoDto) {
    if (
      dto.filialId &&
      !(await this.prisma.client.filial.findFirst({
        where: { id: dto.filialId, empresaId, ativa: true },
      }))
    )
      throw new BadRequestException('Filial indisponível');
    return this.prisma.client.lancamentoFinanceiro.create({
      data: { ...dto, empresaId, vencimento: new Date(dto.vencimento) },
    });
  }
  async baixar(empresaId: string, id: string, dto: BaixaDto) {
    return this.prisma.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM lancamentos_financeiros WHERE id=${id} AND empresa_id=${empresaId} FOR UPDATE`;
      const conta = await tx.lancamentoFinanceiro.findFirst({ where: { id, empresaId } });
      if (!conta) throw new NotFoundException('Conta não encontrada');
      const repetida = await tx.baixaFinanceira.findUnique({ where: { chave: dto.chave } });
      if (repetida) {
        if (repetida.lancamentoId !== id || !repetida.valor.equals(dto.valor))
          throw new ConflictException('A identificação do pagamento já foi utilizada');
        return conta;
      }
      if (conta.status === 'CANCELADO') throw new ConflictException('A conta foi cancelada');
      const pago = conta.valorPago.plus(dto.valor);
      if (pago.gt(conta.valor))
        throw new BadRequestException('O pagamento ultrapassa o saldo em aberto');
      await tx.baixaFinanceira.create({
        data: { lancamentoId: id, chave: dto.chave, valor: dto.valor },
      });
      return tx.lancamentoFinanceiro.update({
        where: { id },
        data: { valorPago: pago, status: pago.equals(conta.valor) ? 'PAGO' : 'PARCIAL' },
      });
    });
  }
  async cancelar(empresaId: string, id: string) {
    return this.prisma.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM lancamentos_financeiros WHERE id=${id} AND empresa_id=${empresaId} FOR UPDATE`;
      const conta = await tx.lancamentoFinanceiro.findFirst({ where: { id, empresaId } });
      if (!conta) throw new NotFoundException('Conta não encontrada');
      if (conta.vendaId)
        throw new ConflictException('Use o estorno da venda para cancelar esta receita');
      if (conta.valorPago.gt(0))
        throw new ConflictException('Estorne os pagamentos antes de cancelar a conta');
      return tx.lancamentoFinanceiro.update({ where: { id }, data: { status: 'CANCELADO' } });
    });
  }
  async estornarBaixa(empresaId: string, contaId: string, baixaId: string) {
    return this.prisma.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM lancamentos_financeiros WHERE id=${contaId} AND empresa_id=${empresaId} FOR UPDATE`;
      const conta = await tx.lancamentoFinanceiro.findFirst({ where: { id: contaId, empresaId } });
      const baixa = await tx.baixaFinanceira.findFirst({
        where: { id: baixaId, lancamentoId: contaId },
      });
      if (!conta || !baixa) throw new NotFoundException('Pagamento não encontrado');
      if (baixa.estornada) return conta;
      if (conta.status === 'CANCELADO') throw new ConflictException('Conta cancelada');
      const restante = conta.valorPago.minus(baixa.valor);
      if (restante.lt(0)) throw new ConflictException('O saldo foi alterado. Atualize a conta');
      await tx.baixaFinanceira.update({
        where: { id: baixaId },
        data: { estornada: true, estornadaEm: new Date() },
      });
      return tx.lancamentoFinanceiro.update({
        where: { id: contaId },
        data: { valorPago: restante, status: restante.isZero() ? 'ABERTO' : 'PARCIAL' },
      });
    });
  }
  async resumo(empresaId: string, inicio: string, fim: string, filialId?: string) {
    const range = dateRange(inicio, fim),
      unit = filialId ? { filialId } : {};
    const [contas, vendas, baixas, estornos] = await Promise.all([
      this.prisma.client.lancamentoFinanceiro.findMany({
        where: {
          empresaId,
          ...unit,
          status: { not: 'CANCELADO' },
          vencimento: { gte: range.inicio, lte: range.fim },
        },
        take: 10001,
      }),
      this.prisma.client.venda.findMany({
        where: {
          empresaId,
          ...unit,
          status: 'CONCLUIDA',
          createdAt: { gte: range.inicio, lte: range.fim },
        },
        include: { itens: true },
        take: 10001,
      }),
      this.prisma.client.baixaFinanceira.findMany({
        where: { data: { gte: range.inicio, lte: range.fim }, lancamento: { empresaId, ...unit } },
        include: { lancamento: { select: { tipo: true } } },
        take: 10001,
      }),
      this.prisma.client.baixaFinanceira.findMany({
        where: {
          estornada: true,
          estornadaEm: { gte: range.inicio, lte: range.fim },
          lancamento: { empresaId, ...unit },
        },
        include: { lancamento: { select: { tipo: true } } },
        take: 10001,
      }),
    ]);
    if ([contas, vendas, baixas, estornos].some((a) => a.length > 10000))
      throw new BadRequestException(
        'Selecione um período menor para consolidar até 10 mil registros',
      );
    const sum = (values: Prisma.Decimal[]) =>
      values.reduce((a, b) => a.plus(b), new Prisma.Decimal(0));
    const receita = sum(vendas.map((v) => v.total)).plus(
      sum(contas.filter((c) => c.tipo === 'RECEITA' && !c.vendaId).map((c) => c.valor)),
    );
    const despesas = sum(contas.filter((c) => c.tipo === 'DESPESA').map((c) => c.valor));
    const itens = vendas.flatMap((v) => v.itens),
      custosDisponiveis = vendas.every(
        (v) => v.itens.length > 0 && v.itens.every((i) => i.custoUnitario !== null),
      );
    const cmv = custosDisponiveis
      ? sum(itens.map((i) => i.custoUnitario!.times(i.quantidade)))
      : null;
    const entradas = sum(
      baixas.filter((b) => b.lancamento.tipo === 'RECEITA').map((b) => b.valor),
    ).plus(sum(estornos.filter((b) => b.lancamento.tipo === 'DESPESA').map((b) => b.valor)));
    const saidas = sum(
      baixas.filter((b) => b.lancamento.tipo === 'DESPESA').map((b) => b.valor),
    ).plus(sum(estornos.filter((b) => b.lancamento.tipo === 'RECEITA').map((b) => b.valor)));
    return {
      receita,
      despesas,
      cmv,
      custosDisponiveis,
      resultado: cmv ? receita.minus(cmv).minus(despesas) : null,
      entradas,
      saidas,
      saldoCaixa: entradas.minus(saidas),
      aReceber: sum(
        contas.filter((c) => c.tipo === 'RECEITA').map((c) => c.valor.minus(c.valorPago)),
      ),
      aPagar: sum(
        contas.filter((c) => c.tipo === 'DESPESA').map((c) => c.valor.minus(c.valorPago)),
      ),
      vendas: vendas.length,
    };
  }
}
