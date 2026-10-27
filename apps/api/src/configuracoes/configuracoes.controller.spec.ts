import { InternalServerErrorException } from '@nestjs/common';
import { ConfiguracoesController } from './configuracoes.controller';
import { PrismaService } from '../database/prisma.service';
import { tenantStorage } from '../database/tenant-context';

// O teste exercita a regra de persistência, sem carregar o servidor da Swagger UI.
jest.mock('@nestjs/swagger', () => ({
  ApiOperation: () => () => undefined,
  ApiResponse: () => () => undefined,
  ApiTags: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
}));

describe('Link público nas configurações', () => {
  let stored: string | null;
  const empresa = {
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const controller = new ConfiguracoesController({
    client: { empresa },
  } as unknown as PrismaService);
  const requestLink = () =>
    tenantStorage.run(
      { tenantId: 'empresa-a', userId: 'usuario-a', role: 'ADMIN', email: 'test@example.test' },
      () => controller.linkAgendamento(),
    );

  beforeEach(() => {
    jest.resetAllMocks();
    stored = null;
    empresa.findFirst.mockImplementation(() => Promise.resolve({ bookingToken: stored }));
    empresa.update.mockImplementation(({ data }: { data: { bookingToken: string } }) => {
      stored = data.bookingToken;
      return Promise.resolve({ bookingToken: stored });
    });
    empresa.updateMany.mockImplementation(
      ({
        where,
        data,
      }: {
        where: { id: string; bookingToken: string | null };
        data: { bookingToken: string };
      }) => {
        if (where.id !== 'empresa-a' || where.bookingToken !== stored)
          return Promise.resolve({ count: 0 });
        stored = data.bookingToken;
        return Promise.resolve({ count: 1 });
      },
    );
  });

  it('devolve o mesmo link persistido para primeiros acessos concorrentes', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, requestLink));
    expect(new Set(results.map(({ token }) => token)).size).toBe(1);
    expect(results.every(({ token }) => token === stored)).toBe(true);
    expect(stored).toMatch(/^[a-f0-9]{32}$/);
    expect(empresa.update).not.toHaveBeenCalled();
    expect(empresa.updateMany).toHaveBeenCalledWith({
      where: { id: 'empresa-a', bookingToken: null },
      data: { bookingToken: expect.any(String) },
    });
  });

  it('preserva um link existente sem gravar novamente', async () => {
    stored = 'link-ja-compartilhado';
    await expect(requestLink()).resolves.toEqual({ token: stored });
    expect(empresa.updateMany).not.toHaveBeenCalled();
    expect(empresa.update).not.toHaveBeenCalled();
  });

  it('não consulta outras empresas quando falta contexto', async () => {
    await expect(controller.linkAgendamento()).resolves.toEqual({ token: null });
    expect(empresa.findFirst).not.toHaveBeenCalled();
  });

  it('tenta outro token somente quando a restrição de unicidade recusa o primeiro', async () => {
    empresa.updateMany.mockRejectedValueOnce({ code: 'P2002' });
    await expect(requestLink()).resolves.toEqual({
      token: expect.stringMatching(/^[a-f0-9]{32}$/),
    });
    expect(empresa.updateMany).toHaveBeenCalledTimes(2);
  });

  it('limita as tentativas em caso de colisões repetidas', async () => {
    empresa.updateMany.mockRejectedValue({ code: 'P2002' });
    await expect(requestLink()).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(empresa.updateMany).toHaveBeenCalledTimes(3);
  });

  it('propaga falha do banco sem repetições silenciosas', async () => {
    const failure = new Error('Banco indisponível');
    empresa.updateMany.mockRejectedValue(failure);
    await expect(requestLink()).rejects.toBe(failure);
    expect(empresa.updateMany).toHaveBeenCalledTimes(1);
  });
});
