import {
  ConflictException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import { GoogleRegisterDto } from './dto/google.dto';

// Identificador público do aplicativo Nexly; não é uma chave secreta.
const NEXLY_CLIENT_ID = '312221207149-3jj903oajmlpooq2ltp68lbhlahttm06.apps.googleusercontent.com';
const NONCE_TTL = 300;
const REGISTRATION_TTL = 900;
type Identity = { sub: string; email: string; nome: string };

@Injectable()
export class GoogleService {
  private readonly client = new OAuth2Client();

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  config() {
    const clientId = (process.env.GOOGLE_CLIENT_ID ?? NEXLY_CLIENT_ID).trim();
    const enabled = /^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId);
    return { enabled, clientId: enabled ? clientId : null };
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async limit(key: string, count: number, seconds: number) {
    const result = await this.redis.consumeLimit(`google:${this.hash(key)}`, count, seconds);
    if (!result)
      throw new ServiceUnavailableException('Login com Google temporariamente indisponível.');
    if (!result.allowed) throw new HttpException('Muitas tentativas. Aguarde alguns minutos.', 429);
  }

  async challenge(ip: string) {
    const config = this.config();
    if (!config.enabled) throw new ServiceUnavailableException('Login com Google não configurado.');
    await this.limit(`challenge:${ip}`, 30, 900);
    const nonce = randomBytes(32).toString('hex');
    if (!(await this.redis.setOnce(`google:nonce:${this.hash(nonce)}`, '1', NONCE_TTL))) {
      throw new ServiceUnavailableException('Não foi possível iniciar o login com Google.');
    }
    return { nonce, clientId: config.clientId! };
  }

  async verify(credential: string, nonce: string | undefined, ip: string): Promise<Identity> {
    const { enabled, clientId } = this.config();
    if (!enabled) throw new ServiceUnavailableException('Login com Google não configurado.');
    await this.limit(`verify:${ip}`, 30, 900);
    if (!nonce || !/^[a-f0-9]{64}$/.test(nonce)) {
      throw new UnauthorizedException('Reinicie o login com Google neste navegador.');
    }
    const challenge = await this.redis.take(`google:nonce:${this.hash(nonce)}`);
    if (!challenge)
      throw new ServiceUnavailableException('Não foi possível validar o login com Google.');
    if (!challenge.value)
      throw new UnauthorizedException('Login expirado ou já utilizado. Tente novamente.');
    let identity;
    try {
      const ticket = await this.client.verifyIdToken({ idToken: credential, audience: clientId! });
      identity = ticket.getPayload();
    } catch {
      throw new UnauthorizedException(
        'Não foi possível validar sua identidade no Google. Tente novamente.',
      );
    }
    if (
      !identity ||
      typeof identity.exp !== 'number' ||
      identity.exp <= Math.floor(Date.now() / 1000) ||
      identity.nonce !== nonce ||
      typeof identity.sub !== 'string' ||
      !identity.sub ||
      identity.sub.length > 255 ||
      identity.email_verified !== true ||
      typeof identity.email !== 'string' ||
      !identity.email ||
      identity.email.length > 254
    ) {
      throw new UnauthorizedException(
        'A conta Google não possui uma identidade válida para este acesso.',
      );
    }
    return {
      sub: identity.sub,
      email: identity.email.toLowerCase(),
      nome: typeof identity.name === 'string' ? identity.name.slice(0, 120) : '',
    };
  }

  async login(identity: Identity, ip: string) {
    const usuario = await this.prisma.client.usuario.findUnique({
      where: { googleSubject: identity.sub },
    });
    if (usuario) return this.auth.loginGoogle(usuario.id);
    const existing = await this.prisma.client.usuario.findUnique({
      where: { email: identity.email },
    });
    if (existing) {
      throw new ConflictException({
        code: 'GOOGLE_LINK_REQUIRED',
        message: 'Entre com e-mail e senha e vincule o Google em Minha conta.',
      });
    }
    await this.limit(`register:${ip}`, 5, 3600);
    const registrationToken = randomBytes(32).toString('hex');
    const stored = await this.redis.setOnce(
      `google:registration:${this.hash(registrationToken)}`,
      JSON.stringify(identity),
      REGISTRATION_TTL,
    );
    if (!stored)
      throw new ServiceUnavailableException(
        'Não foi possível preparar seu cadastro. Tente novamente.',
      );
    return {
      requiresRegistration: true as const,
      registrationToken,
      email: identity.email,
      nome: identity.nome,
    };
  }

  async register(dto: GoogleRegisterDto, browserToken: string | undefined, ip: string) {
    if (!browserToken || dto.registrationToken !== browserToken) {
      throw new UnauthorizedException('Reinicie o cadastro com Google neste navegador.');
    }
    await this.limit(`complete:${ip}`, 10, 900);
    const key = `google:registration:${this.hash(dto.registrationToken)}`;
    const stored = await this.redis.get(key);
    if (!stored)
      throw new UnauthorizedException('Cadastro com Google expirado. Entre novamente com Google.');
    const identity = JSON.parse(stored) as Identity;
    if (dto.email !== identity.email)
      throw new UnauthorizedException('Use o e-mail confirmado pelo Google.');
    const result = await this.auth.register(dto, ip, identity.sub);
    await this.redis.del(key);
    return result;
  }
}
