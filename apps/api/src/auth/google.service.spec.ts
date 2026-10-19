import { createSign, generateKeyPairSync } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleService } from './google.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import { GoogleRegisterDto } from './dto/google.dto';

const CLIENT_ID = 'unit-test.apps.googleusercontent.com';
type CertificateFormat = Awaited<
  ReturnType<OAuth2Client['getFederatedSignonCertsAsync']>
>['format'];
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
function signed(nonce: string, changes: Record<string, unknown> = {}, wrongSignature = false) {
  const now = Math.floor(Date.now() / 1000);
  const input = `${encode({ alg: 'RS256', kid: 'test' })}.${encode({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: 'google-123',
    email: 'pessoa@gmail.com',
    email_verified: true,
    nonce,
    iat: now - 10,
    exp: now + 3600,
    ...changes,
  })}`;
  const signer = createSign('RSA-SHA256').update(input);
  const signature = signer.sign(keys.privateKey).toString('base64url');
  return `${input}.${wrongSignature ? 'broken-signature' : signature}`;
}

describe('Google: verificação criptográfica e continuação de cadastro', () => {
  let service: GoogleService;
  let values: Map<string, string>;
  let redis: {
    consumeLimit: jest.Mock;
    setOnce: jest.Mock;
    take: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };
  let prisma: { client: { usuario: { findUnique: jest.Mock } } };
  let auth: { register: jest.Mock; loginGoogle: jest.Mock };
  const previous = process.env.GOOGLE_CLIENT_ID;

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    values = new Map();
    redis = {
      consumeLimit: jest.fn().mockResolvedValue({ allowed: true }),
      setOnce: jest.fn((key: string, value: string) => {
        if (values.has(key)) return Promise.resolve(false);
        values.set(key, value);
        return Promise.resolve(true);
      }),
      take: jest.fn((key: string) => {
        const value = values.get(key) ?? null;
        values.delete(key);
        return Promise.resolve({ value });
      }),
      get: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
      del: jest.fn((key: string) => {
        values.delete(key);
        return Promise.resolve();
      }),
    };
    prisma = { client: { usuario: { findUnique: jest.fn().mockResolvedValue(null) } } };
    auth = {
      register: jest.fn().mockResolvedValue({ accessToken: 'session' }),
      loginGoogle: jest.fn().mockResolvedValue({ requiresTwoFactor: true }),
    };
    jest.spyOn(OAuth2Client.prototype, 'getFederatedSignonCertsAsync').mockResolvedValue({
      certs: { test: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString() },
      format: 'PEM' as CertificateFormat,
    });
    service = new GoogleService(
      redis as unknown as RedisService,
      prisma as unknown as PrismaService,
      auth as unknown as AuthService,
    );
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = previous;
  });

  it('valida assinatura RSA real e associa por subject, sem usar e-mail como identidade', async () => {
    const { nonce } = await service.challenge('127.0.0.1');
    await expect(service.verify(signed(nonce), nonce, '127.0.0.1')).resolves.toEqual({
      sub: 'google-123',
      email: 'pessoa@gmail.com',
      nome: '',
    });
    await expect(service.verify(signed(nonce), nonce, '127.0.0.1')).rejects.toThrow('já utilizado');
  });
  it.each([
    ['outro aplicativo', { aud: 'attacker.apps.googleusercontent.com' }],
    ['emissor externo', { iss: 'https://attacker.test' }],
    ['expirado', { exp: Math.floor(Date.now() / 1000) - 3600 }],
    [
      'expirado dentro da tolerância de relógio do SDK',
      { exp: Math.floor(Date.now() / 1000) - 30 },
    ],
    ['nonce diferente', { nonce: 'b'.repeat(64) }],
    ['e-mail não verificado', { email_verified: false }],
    ['e-mail ausente', { email: undefined }],
    ['subject ausente', { sub: '' }],
    ['subject inválido', { sub: { value: 'invalid' } }],
  ])('recusa token com %s', async (_name, changes) => {
    const { nonce } = await service.challenge('ip');
    await expect(service.verify(signed(nonce, changes), nonce, 'ip')).rejects.toThrow(
      UnauthorizedException,
    );
  });
  it('recusa assinatura adulterada', async () => {
    const { nonce } = await service.challenge('ip');
    await expect(service.verify(signed(nonce, {}, true), nonce, 'ip')).rejects.toThrow(
      UnauthorizedException,
    );
  });
  it('exige o desafio do navegador', async () => {
    await expect(service.verify(signed('a'.repeat(64)), undefined, 'ip')).rejects.toThrow(
      UnauthorizedException,
    );
  });
  it('somente uma requisição concorrente consome o desafio', async () => {
    const { nonce } = await service.challenge('ip');
    const results = await Promise.allSettled([
      service.verify(signed(nonce), nonce, 'ip'),
      service.verify(signed(nonce), nonce, 'ip'),
    ]);
    expect(results.filter((value) => value.status === 'fulfilled')).toHaveLength(1);
  });
  it('falha fechada se a cota ou o armazenamento estiver indisponível', async () => {
    redis.consumeLimit.mockResolvedValue(null);
    await expect(service.challenge('ip')).rejects.toThrow(ServiceUnavailableException);
    redis.consumeLimit.mockResolvedValue({ allowed: true });
    redis.setOnce.mockResolvedValue(null);
    await expect(service.challenge('ip')).rejects.toThrow(ServiceUnavailableException);
    redis.take.mockResolvedValue(null);
    await expect(service.verify('invalid', 'a'.repeat(64), 'ip')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
  it('aplica cota distribuída e permite desativação explícita', async () => {
    redis.consumeLimit.mockResolvedValue({ allowed: false });
    await expect(service.challenge('ip')).rejects.toMatchObject({ status: 429 });
    process.env.GOOGLE_CLIENT_ID = '';
    expect(service.config()).toEqual({ enabled: false, clientId: null });
    await expect(service.challenge('ip')).rejects.toThrow(ServiceUnavailableException);
  });
  it('não vincula uma conta existente apenas por e-mail', async () => {
    prisma.client.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing' });
    await expect(
      service.login({ sub: 'google', email: 'same@gmail.com', nome: 'Nome' }, 'ip'),
    ).rejects.toThrow(ConflictException);
    expect(auth.loginGoogle).not.toHaveBeenCalled();
    expect(auth.register).not.toHaveBeenCalled();
  });
  it('conta vinculada mantém o fluxo de 2FA da autenticação existente', async () => {
    prisma.client.usuario.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(
      service.login({ sub: 'google', email: 'changed@gmail.com', nome: '' }, 'ip'),
    ).resolves.toEqual({ requiresTwoFactor: true });
    expect(auth.loginGoogle).toHaveBeenCalledWith('existing');
  });
  it('cadastro exige prova no mesmo navegador e preserva prova após erro de validação', async () => {
    const started = await service.login(
      { sub: 'google', email: 'person@gmail.com', nome: 'Pessoa' },
      'ip',
    );
    if (!('registrationToken' in started)) throw new Error('Deveria iniciar cadastro');
    const dto = {
      registrationToken: started.registrationToken,
      email: 'person@gmail.com',
    } as GoogleRegisterDto;
    await expect(service.register(dto, undefined, 'ip')).rejects.toThrow(UnauthorizedException);
    await expect(
      service.register({ ...dto, email: 'attacker@gmail.com' }, dto.registrationToken, 'ip'),
    ).rejects.toThrow(UnauthorizedException);
    auth.register.mockRejectedValueOnce(new Error('CNPJ inválido'));
    await expect(service.register(dto, dto.registrationToken, 'ip')).rejects.toThrow(
      'CNPJ inválido',
    );
    await service.register(dto, dto.registrationToken, 'ip');
    expect(auth.register).toHaveBeenCalledWith(dto, 'ip', 'google');
    await expect(service.register(dto, dto.registrationToken, 'ip')).rejects.toThrow('expirado');
  });
});
