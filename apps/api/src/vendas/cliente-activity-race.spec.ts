import { Prisma } from '@prisma/client';
import { registrarVisitaClienteTx } from '../clientes/cliente-activity';
import { PrismaService } from '../database/prisma.service';
import { tenantStorage } from '../database/tenant-context';
import { EstoqueService } from '../estoque/estoque.service';
import { VendasService } from './vendas.service';

// Deterministic reproduction without a database or external provider.
it('preserva visita concluída entre a leitura do histórico e atualização do CRM no estorno', async () => {
  const anterior = new Date('2026-10-29T12:00:00Z');
  const nova = new Date('2026-10-30T12:00:00Z');
  let ultimaVisita: Date | null = anterior;
  let historyRead!: () => void;
  let releaseHistory!: () => void;
  let unlockCliente!: () => void;
  let clienteBloqueado = false;
  const historyReadGate = new Promise<void>((resolve) => {
    historyRead = resolve;
  });
  const releaseGate = new Promise<void>((resolve) => {
    releaseHistory = resolve;
  });
  const clienteLock = new Promise<void>((resolve) => {
    unlockCliente = resolve;
  });
  const venda = {
    id: 'v1',
    clienteId: 'c1',
    status: 'CONCLUIDA',
    itens: [],
    cupomId: null,
    filialId: null,
  };
  const tx = {
    $queryRaw: jest.fn((sql: TemplateStringsArray) => {
      if (sql.join('').includes('FOR NO KEY UPDATE')) clienteBloqueado = true;
      return Promise.resolve([]);
    }),
    venda: {
      findFirst: jest.fn((args: { where: { id?: string } }) =>
        Promise.resolve(args.where.id ? venda : { createdAt: anterior }),
      ),
      update: jest.fn().mockResolvedValue({}),
      aggregate: jest.fn().mockResolvedValue({ _sum: { total: new Prisma.Decimal(0) } }),
    },
    lancamentoFinanceiro: { findFirst: jest.fn().mockResolvedValue(null) },
    agendamento: {
      findFirst: jest.fn(async () => {
        // A committed completion after this read is absent from its snapshot.
        const snapshot = { dataHora: anterior };
        historyRead();
        await releaseGate;
        return snapshot;
      }),
    },
    cliente: {
      updateMany: jest.fn(
        (args: { where: { OR?: unknown }; data: { ultimaVisita: Date | null } }) => {
          if (
            !args.where.OR ||
            !ultimaVisita ||
            (args.data.ultimaVisita && ultimaVisita < args.data.ultimaVisita)
          )
            ultimaVisita = args.data.ultimaVisita;
          return Promise.resolve({ count: 1 });
        },
      ),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    client: {
      $transaction: async (callback: (client: typeof tx) => unknown) => {
        try {
          return await callback(tx);
        } finally {
          unlockCliente();
        }
      },
    },
  };
  const agendaTx = {
    cliente: {
      updateMany: async (args: Parameters<typeof tx.cliente.updateMany>[0]) => {
        if (clienteBloqueado) await clienteLock;
        return tx.cliente.updateMany(args);
      },
    },
  };
  const service = new VendasService(prisma as unknown as PrismaService, {} as EstoqueService);
  await tenantStorage.run(
    { tenantId: 'e1', userId: 'u1', role: 'ADMIN', email: 'unit@example.test' },
    async () => {
      const estorno = service.estornar('v1', 'Estorno de teste unitário', 'u1');
      await historyReadGate;
      const visita = registrarVisitaClienteTx(
        agendaTx as unknown as Prisma.TransactionClient,
        'e1',
        'c1',
        nova,
      );
      releaseHistory();
      await Promise.all([estorno, visita]);
      expect(ultimaVisita).toEqual(nova);
    },
  );
});
