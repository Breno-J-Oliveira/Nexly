import { AssinaturasScheduler } from './assinaturas.scheduler';
import { AssinaturasService } from './assinaturas.service';
import { StripeGateway } from './stripe.gateway';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';

describe('Reconciliação periódica de assinaturas', () => {
  function fixture() {
    const db = { assinatura: { findMany: jest.fn().mockResolvedValue([]) } };
    const jobs = { register: jest.fn(), adicionar: jest.fn().mockResolvedValue({}) };
    const assinaturas = { reconciliarAgendada: jest.fn().mockResolvedValue(undefined) };
    const gateway = { enabled: true, mode: 'live' };
    const scheduler = new AssinaturasScheduler(
      { client: db } as unknown as PrismaService,
      jobs as unknown as JobsService,
      assinaturas as unknown as AssinaturasService,
      gateway as unknown as StripeGateway,
    );
    return { scheduler, db, jobs, assinaturas, gateway };
  }

  it('percorre mais de uma página sem carregar dados pessoais ou credenciais na fila', async () => {
    const { scheduler, db, jobs } = fixture();
    db.assinatura.findMany
      .mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => ({ empresaId: `e${i}` })))
      .mockResolvedValueOnce([{ empresaId: 'z' }]);
    await scheduler.enfileirar(new Date('2026-10-23T12:00:00Z'));
    expect(jobs.adicionar).toHaveBeenCalledTimes(101);
    expect(db.assinatura.findMany).toHaveBeenNthCalledWith(2, {
      where: { ambiente: 'live', customerId: { not: null }, empresaId: { gt: 'e99' } },
      select: { empresaId: true },
      orderBy: { empresaId: 'asc' },
      take: 100,
    });
    expect(jobs.adicionar).toHaveBeenLastCalledWith(
      'z',
      'ASSINATURA_RECONCILIAR',
      expect.stringMatching(/^assinatura:live:z:\d+$/),
      { ambiente: 'live' },
    );
  });

  it('usa a mesma chave por hora entre réplicas e cria novo ciclo na próxima hora', async () => {
    const a = fixture();
    const b = fixture();
    a.db.assinatura.findMany.mockResolvedValue([{ empresaId: 'e' }]);
    b.db.assinatura.findMany.mockResolvedValue([{ empresaId: 'e' }]);
    await a.scheduler.enfileirar(new Date('2026-10-23T12:01:00Z'));
    await b.scheduler.enfileirar(new Date('2026-10-23T12:59:00Z'));
    expect(a.jobs.adicionar.mock.calls[0]).toEqual(b.jobs.adicionar.mock.calls[0]);
    await a.scheduler.enfileirar(new Date('2026-10-23T13:00:00Z'));
    expect(a.jobs.adicionar.mock.calls[1]?.[2]).not.toEqual(a.jobs.adicionar.mock.calls[0]?.[2]);
  });

  it('não agenda com Stripe desativado ou após encerramento do serviço', async () => {
    const { scheduler, db, gateway } = fixture();
    gateway.enabled = false;
    await scheduler.enfileirar();
    gateway.enabled = true;
    scheduler.onModuleDestroy();
    await scheduler.enfileirar();
    expect(db.assinatura.findMany).not.toHaveBeenCalled();
  });

  it('impede varreduras simultâneas no processo e retoma após erro de banco', async () => {
    const { scheduler, db } = fixture();
    db.assinatura.findMany.mockRejectedValueOnce(new Error('banco indisponível'));
    const result = await Promise.allSettled([scheduler.enfileirar(), scheduler.enfileirar()]);
    expect(result.map((r) => r.status)).toEqual(['rejected', 'fulfilled']);
    expect(db.assinatura.findMany).toHaveBeenCalledTimes(1);
    await scheduler.enfileirar();
    expect(db.assinatura.findMany).toHaveBeenCalledTimes(2);
  });

  it('interrompe a varredura no desligamento sem perder a possibilidade de repetir o ciclo', async () => {
    const { scheduler, db, jobs } = fixture();
    db.assinatura.findMany.mockResolvedValue([{ empresaId: 'a' }, { empresaId: 'b' }]);
    jobs.adicionar.mockImplementationOnce(() => {
      scheduler.onModuleDestroy();
      return Promise.resolve({});
    });
    await scheduler.enfileirar();
    expect(jobs.adicionar).toHaveBeenCalledTimes(1);
  });

  it('o handler usa a empresa da reserva e propaga a falha para as tentativas da fila', async () => {
    const { scheduler, jobs, assinaturas } = fixture();
    scheduler.onModuleInit();
    expect(jobs.register).toHaveBeenCalledWith('ASSINATURA_RECONCILIAR', expect.any(Function));
    const handler = jobs.register.mock.calls[0]![1];
    await handler(
      { ambiente: 'live', empresaId: 'outra-empresa' },
      { empresaId: 'empresa-da-fila' },
    );
    expect(assinaturas.reconciliarAgendada).toHaveBeenCalledWith('empresa-da-fila', 'live');
    assinaturas.reconciliarAgendada.mockRejectedValueOnce(new Error('Stripe indisponível'));
    await expect(handler({ ambiente: 'live' }, { empresaId: 'e' })).rejects.toThrow(
      'Stripe indisponível',
    );
    await expect(handler(null, { empresaId: 'e' })).rejects.toThrow('Ambiente');
  });
});
