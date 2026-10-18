import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { FinanceiroOperacionalService } from './financeiro-operacional.service';
const d = (n: number) => new Prisma.Decimal(n);
describe('Financeiro operacional', () => {
  function fixture() {
    const tx = {
      $queryRaw: jest.fn(),
      lancamentoFinanceiro: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'c', valor: d(100), valorPago: d(20), status: 'PARCIAL' }),
        update: jest.fn().mockImplementation((a) => Promise.resolve(a.data)),
      },
      baixaFinanceira: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const client = {
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
      lancamentoFinanceiro: { findMany: jest.fn().mockResolvedValue([]) },
      venda: { findMany: jest.fn().mockResolvedValue([]) },
      baixaFinanceira: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return {
      tx,
      client,
      service: new FinanceiroOperacionalService({ client } as unknown as PrismaService),
    };
  }
  it('pagamento parcial usa decimal e bloqueia a conta durante a transação', async () => {
    const { service, tx } = fixture();
    const result = await service.baixar('empresa', 'c', { chave: 'k', valor: 30 });
    expect(result.valorPago.toString()).toBe('50');
    expect(result.status).toBe('PARCIAL');
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.baixaFinanceira.create).toHaveBeenCalledTimes(1);
  });
  it('repetição idêntica não cria outra baixa', async () => {
    const { service, tx } = fixture();
    tx.baixaFinanceira.findUnique.mockResolvedValue({ lancamentoId: 'c', valor: d(30) });
    await service.baixar('empresa', 'c', { chave: 'k', valor: 30 });
    expect(tx.baixaFinanceira.create).not.toHaveBeenCalled();
  });
  it('rejeita chave repetida com valor diferente', async () => {
    const { service, tx } = fixture();
    tx.baixaFinanceira.findUnique.mockResolvedValue({ lancamentoId: 'c', valor: d(30) });
    await expect(service.baixar('empresa', 'c', { chave: 'k', valor: 31 })).rejects.toThrow(
      /identificação/,
    );
  });
  it('não permite pagar acima do saldo ou conta cancelada', async () => {
    const { service, tx } = fixture();
    await expect(service.baixar('empresa', 'c', { chave: 'k', valor: 81 })).rejects.toThrow(
      /ultrapassa/,
    );
    tx.lancamentoFinanceiro.findFirst.mockResolvedValue({ status: 'CANCELADO' });
    await expect(service.baixar('empresa', 'c', { chave: 'k', valor: 1 })).rejects.toThrow(
      /cancelada/,
    );
    expect(tx.baixaFinanceira.create).not.toHaveBeenCalled();
  });
  it('preserva receita original e registra estorno como saída no período', async () => {
    const { service, client } = fixture();
    client.baixaFinanceira.findMany
      .mockResolvedValueOnce([{ valor: d(30), lancamento: { tipo: 'RECEITA' } }])
      .mockResolvedValueOnce([{ valor: d(10), lancamento: { tipo: 'RECEITA' } }]);
    const r = await service.resumo('empresa', '2026-10-01', '2026-10-31');
    expect(r.entradas.toString()).toBe('30');
    expect(r.saidas.toString()).toBe('10');
    expect(r.saldoCaixa.toString()).toBe('20');
  });
  it('venda com custo desconhecido não inventa lucro', async () => {
    const { service, client } = fixture();
    client.venda.findMany.mockResolvedValue([
      { total: d(100), itens: [{ custoUnitario: null, quantidade: 2 }] },
    ]);
    const r = await service.resumo('empresa', '2026-10-01', '2026-10-31');
    expect(r.receita.toString()).toBe('100');
    expect(r.resultado).toBeNull();
    expect(r.custosDisponiveis).toBe(false);
  });
  it('custo histórico conhecido e despesas entram no resultado sem duplicar a venda', async () => {
    const { service, client } = fixture();
    client.venda.findMany.mockResolvedValue([
      { total: d(100), itens: [{ custoUnitario: d(10), quantidade: 2 }] },
    ]);
    client.lancamentoFinanceiro.findMany.mockResolvedValue([
      { tipo: 'RECEITA', vendaId: 'v', valor: d(100), valorPago: d(0) },
      { tipo: 'DESPESA', valor: d(5), valorPago: d(0) },
    ]);
    const r = await service.resumo('empresa', '2026-10-01', '2026-10-31');
    expect(r.receita.toString()).toBe('100');
    expect(r.cmv?.toString()).toBe('20');
    expect(r.resultado?.toString()).toBe('75');
  });
  it('período inválido não consulta o banco', async () => {
    const { service, client } = fixture();
    await expect(service.resumo('e', '2026-02-31', '2026-10-01')).rejects.toThrow();
    expect(client.venda.findMany).not.toHaveBeenCalled();
  });
});

describe('Venda legada sem itens', () => {
  it('não considera custo conhecido quando faltam os itens da venda', async () => {
    const prisma = {
      client: {
        lancamentoFinanceiro: { findMany: jest.fn().mockResolvedValue([]) },
        venda: { findMany: jest.fn().mockResolvedValue([{ total: d(100), itens: [] }]) },
        baixaFinanceira: { findMany: jest.fn().mockResolvedValue([]) },
      },
    };
    const service = new FinanceiroOperacionalService(prisma as unknown as PrismaService);
    const r = await service.resumo('e', '2026-10-01', '2026-10-31');
    expect(r.custosDisponiveis).toBe(false);
    expect(r.resultado).toBeNull();
  });
});
