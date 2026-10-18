import { AuditService } from './audit.service';
import { PrismaService } from '../database/prisma.service';
describe('Filtros do histórico', () => {
  const db = { auditLog: { findMany: jest.fn(), count: jest.fn() } };
  const service = new AuditService({ client: db } as unknown as PrismaService);
  it.each([
    { pagina: NaN },
    { pagina: 0 },
    { acao: 'INEXISTENTE' },
    { inicio: '2026-02-31' },
    { inicio: '2026-10-20', fim: '2026-10-01' },
  ])('recusa filtro inválido sem consultar registros: %o', async (filtro) => {
    await expect(
      service.listar({ empresaId: 'empresa', pagina: 1, limite: 25, ...filtro }),
    ).rejects.toThrow();
    expect(db.auditLog.findMany).not.toHaveBeenCalled();
  });
});
