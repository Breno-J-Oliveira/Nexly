import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';
import { LoginThrottleService } from './login-throttle.service';
import { AuditService } from '../audit/audit.service';
import { AceitarConviteDto, ConviteTokenDto } from './dto/aceitar-convite.dto';

jest.mock('argon2', () => ({ argon2id: 2, hash: jest.fn().mockResolvedValue('hashed') }));

describe('consumo de convite', () => {
  const invitation = {
    id: randomUUID(),
    token: randomUUID(),
    empresaId: 'empresa',
    email: 'guest@example.test',
    role: 'CAIXA',
    usado: false,
    expiresAt: new Date(Date.now() + 60000),
  };
  const conviteUsuario = { findUnique: jest.fn(), updateMany: jest.fn() };
  const usuario = { findUnique: jest.fn(), create: jest.fn() };
  const client = { conviteUsuario, usuario, $transaction: jest.fn() };
  const service = new AuthService(
    { client } as unknown as PrismaService,
    {} as TokenService,
    {} as LoginThrottleService,
    {} as AuditService,
  );
  const dto = { token: invitation.token, nome: 'Convidado', senha: 'SenhaLocal123!' };

  beforeEach(() => {
    jest.clearAllMocks();
    conviteUsuario.findUnique.mockResolvedValue(invitation);
    conviteUsuario.updateMany.mockResolvedValue({ count: 1 });
    usuario.findUnique.mockResolvedValue(null);
    usuario.create.mockResolvedValue({ id: 'guest' });
    client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(client),
    );
  });

  it('consome o convite e cria somente a identidade armazenada pelo servidor', async () => {
    await expect(service.aceitarConvite(dto)).resolves.toEqual({ success: true });
    expect(conviteUsuario.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: invitation.id,
        token: invitation.token,
        usado: false,
        empresaId: invitation.empresaId,
        email: invitation.email,
        role: invitation.role,
        expiresAt: { gt: expect.any(Date) },
      }),
      data: { usado: true },
    });
    expect(usuario.create).toHaveBeenCalledWith({
      data: {
        empresaId: invitation.empresaId,
        email: invitation.email,
        role: invitation.role,
        nome: dto.nome,
        senhaHash: 'hashed',
      },
    });
    expect(conviteUsuario.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      usuario.create.mock.invocationCallOrder[0]!,
    );
  });

  it('não cria usuário se convite for consumido, revogado ou expirar durante o hash', async () => {
    conviteUsuario.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.aceitarConvite(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(argon2.hash).toHaveBeenCalled();
    expect(usuario.create).not.toHaveBeenCalled();
  });

  it.each([null, { ...invitation, usado: true }, { ...invitation, expiresAt: new Date(0) }])(
    'recusa convites inelegíveis antes de calcular a senha',
    async (value) => {
      conviteUsuario.findUnique.mockResolvedValue(value);
      await expect(service.aceitarConvite(dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(argon2.hash).not.toHaveBeenCalled();
      expect(client.$transaction).not.toHaveBeenCalled();
    },
  );

  it('limita o token a UUID v4 nos dois corpos públicos', async () => {
    for (const Type of [ConviteTokenDto, AceitarConviteDto]) {
      const invalid = Object.assign(new Type(), { ...dto, token: 'x'.repeat(10000) });
      expect((await validate(invalid)).some((error) => error.property === 'token')).toBe(true);
      const valid = Object.assign(new Type(), dto);
      expect(await validate(valid)).toEqual([]);
    }
  });
});
