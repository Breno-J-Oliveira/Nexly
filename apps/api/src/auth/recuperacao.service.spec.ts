import argon2 from 'argon2';
import { RecuperacaoService } from './recuperacao.service';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { RedisService } from '../redis/redis.service';
jest.mock('argon2', () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue('hash-seguro'), argon2id: 2 },
}));
describe('Recuperação segura de senha', () => {
  const original = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EMAIL_PROVIDER;
  });
  afterEach(() => {
    process.env = { ...original };
  });
  function fixture() {
    const client = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      recuperacaoSenha: {
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
      },
      authSession: { updateMany: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
      $queryRaw: jest.fn(),
      $transaction: jest.fn(),
    };
    client.$transaction.mockImplementation((cb) => cb(client));
    const jobs = { adicionar: jest.fn(), register: jest.fn() },
      redis = { consumeLimit: jest.fn().mockResolvedValue({ allowed: true }) };
    return {
      client,
      jobs,
      redis,
      service: new RecuperacaoService(
        { client } as unknown as PrismaService,
        jobs as unknown as JobsService,
        redis as unknown as RedisService,
      ),
    };
  }
  it('permanece desativada sem consultar usuário nem enviar mensagem', async () => {
    const { service, client, jobs } = fixture();
    expect(await service.solicitar('a@example.test', 'local')).toMatchObject({ disponivel: false });
    expect(client.usuario.findUnique).not.toHaveBeenCalled();
    expect(jobs.adicionar).not.toHaveBeenCalled();
  });
  it('ignora configuração incompleta', () => {
    process.env.EMAIL_PROVIDER = 'resend';
    const { service } = fixture();
    expect(service.disponivel()).toBe(false);
  });
  it('token inválido é rejeitado antes do cálculo caro da senha', async () => {
    const { service } = fixture();
    await expect(service.redefinir('a'.repeat(64), 'TesteSeguro123!', 'ip')).rejects.toThrow(
      /inválido/,
    );
    expect(argon2.hash).not.toHaveBeenCalled();
  });
  it('falha fechada se não puder validar a cota', async () => {
    const { service, redis, client } = fixture();
    redis.consumeLimit.mockResolvedValue(null);
    await expect(service.redefinir('a'.repeat(64), 'TesteSeguro123!', 'ip')).rejects.toThrow(
      /Aguarde/,
    );
    expect(client.recuperacaoSenha.findUnique).not.toHaveBeenCalled();
  });
  it('troca a senha uma vez e revoga sessões sem desativar o segundo fator', async () => {
    const { service, client } = fixture();
    client.recuperacaoSenha.findUnique.mockResolvedValue({
      id: 'r',
      usuarioId: 'u',
      usadoEm: null,
      expiresAt: new Date(Date.now() + 60000),
    });
    await service.redefinir('a'.repeat(64), 'TesteSeguro123!', 'ip');
    expect(client.authSession.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u' },
      data: { revogado: true },
    });
    expect(client.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u' },
      data: { revogado: true },
    });
    const args = client.usuario.updateMany.mock.calls[0]?.[0];
    expect(args.data).not.toHaveProperty('twoFactorSecret');
    expect(args.data.senhaHash).toBe('hash-seguro');
  });
  it('concorrência perdedora não altera a senha', async () => {
    const { service, client } = fixture();
    client.recuperacaoSenha.findUnique.mockResolvedValue({
      id: 'r',
      usuarioId: 'u',
      usadoEm: null,
      expiresAt: new Date(Date.now() + 60000),
    });
    client.recuperacaoSenha.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.redefinir('a'.repeat(64), 'TesteSeguro123!', 'ip')).rejects.toThrow(
      /inválido/,
    );
    expect(client.usuario.updateMany).not.toHaveBeenCalled();
  });
  it('pedido válido mantém token cifrado na fila e só hash no banco', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 'somente-fixture';
    process.env.EMAIL_FROM = 'Nexly <teste@example.test>';
    process.env.EMAIL_QUEUE_KEY = 'a'.repeat(64);
    process.env.PUBLIC_APP_URL = 'https://example.test';
    const { service, client, jobs } = fixture();
    client.usuario.findUnique.mockResolvedValue({ id: 'u', empresaId: 'e', ativo: true });
    const response = await service.solicitar('a@example.test', 'ip');
    expect(response.message).toMatch(/Se a conta existir/);
    const persisted = client.recuperacaoSenha.create.mock.calls[0]?.[0].data;
    expect(persisted.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted).not.toHaveProperty('token');
    const payload = jobs.adicionar.mock.calls[0]?.[3];
    expect(payload).toHaveProperty('tag');
    expect(JSON.stringify(payload)).not.toContain('https://');
  });

  it.each([4, 12, 15])(
    'fila rejeita tag truncada para %i bytes antes de consultar o destinatário',
    async (length) => {
      process.env.EMAIL_PROVIDER = 'resend';
      process.env.RESEND_API_KEY = 'somente-fixture';
      process.env.EMAIL_FROM = 'Nexly <teste@example.test>';
      process.env.EMAIL_QUEUE_KEY = 'a'.repeat(64);
      process.env.PUBLIC_APP_URL = 'https://example.test';
      const { service, client, jobs } = fixture();
      client.usuario.findUnique.mockResolvedValue({ id: 'u', empresaId: 'e', ativo: true });
      await service.solicitar('a@example.test', 'ip');
      const payload = jobs.adicionar.mock.calls[0]?.[3];
      service.onModuleInit();
      const handle = jobs.register.mock.calls[0]?.[1];
      await expect(
        handle({ ...payload, tag: payload.tag.slice(0, length * 2) }, { empresaId: 'e', id: 'j' }),
      ).rejects.toThrow();
      expect(client.recuperacaoSenha.findUnique).not.toHaveBeenCalled();
      // A mensagem original continua legível; não existe destinatário nesta fixture.
      await expect(handle(payload, { empresaId: 'e', id: 'j' })).resolves.toBeUndefined();
      expect(client.recuperacaoSenha.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: client.recuperacaoSenha.create.mock.calls[0]?.[0].data.tokenHash },
        include: { usuario: { select: { email: true, ativo: true, empresaId: true } } },
      });
    },
  );
});
