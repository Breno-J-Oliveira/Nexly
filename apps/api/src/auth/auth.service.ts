import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { authenticator } from '@otplib/preset-default';
import { Prisma, Usuario } from '@prisma/client';
import { Plano } from '@prisma/client';
import {
  Role,
  UsuarioPublico,
  validarCnpj,
  MODULE_IDS,
  normalizeModules,
  RECOVERY_CODE_BYTES,
} from '@nexly/shared';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { LoginThrottleService } from './login-throttle.service';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioPublico;
  requiresTwoFactor?: false;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly throttle: LoginThrottleService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto, ip?: string, googleSubject?: string): Promise<AuthResult> {
    if (dto.aceitouTermos !== true) throw new BadRequestException('Aceite dos termos obrigatório');
    const cnpj = dto.cnpj.replace(/\D/g, '');
    if (!validarCnpj(cnpj)) {
      throw new BadRequestException('CNPJ inválido');
    }

    const existing = await this.prisma.client.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'E-mail já cadastrado',
      });
    }

    const senhaHash = await argon2.hash(dto.senha, { type: argon2.argon2id });

    const empresa = await this.prisma.client.empresa.create({
      data: {
        nome: dto.empresaNome,
        cnpj,
        telefone: dto.telefone,
        segmento: dto.segmento,
        cidade: dto.cidade,
        preset: dto.preset,
        modulos: normalizeModules(dto.modulos ?? MODULE_IDS),
        plano: Plano.FREE,
        usuarios: {
          create: {
            nome: dto.responsavelNome,
            email: dto.email,
            senhaHash,
            googleSubject,
            role: Role.ADMIN,
            termosAceite: { create: { versao: '1.0', ip: ip ?? null } },
          },
        },
      },
      include: { usuarios: true },
    });

    const usuario = empresa.usuarios[0];
    if (!usuario || !usuario.ativo) {
      throw new InternalServerErrorException('Falha ao criar usuário administrador');
    }

    return this.buildAuthResult(usuario);
  }

  async loginGoogle(userId: string) {
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: userId } });
    if (!usuario?.ativo || !usuario.googleSubject)
      throw new UnauthorizedException('Acesso indisponível.');
    this.auditService.registrar({
      empresaId: usuario.empresaId,
      usuarioId: usuario.id,
      acao: 'LOGIN',
      recurso: 'Auth',
    });
    if (usuario.twoFactorEnabled) {
      return {
        requiresTwoFactor: true as const,
        tempToken: await this.tokenService.generateTempToken(usuario.id),
      };
    }
    return this.buildAuthResult(usuario);
  }

  async googleStatus(userId: string) {
    const user = await this.prisma.client.usuario.findUnique({
      where: { id: userId },
      select: { googleSubject: true },
    });
    return { linked: Boolean(user?.googleSubject) };
  }

  async linkGoogle(
    userId: string,
    identity: { sub: string; email: string },
    password: string,
    code?: string,
  ) {
    const key = `google-link:${userId}`;
    if (await this.throttle.isBlocked(key))
      throw new UnauthorizedException('Muitas tentativas. Aguarde alguns minutos.');
    const user = await this.prisma.client.usuario.findUnique({ where: { id: userId } });
    if (!user?.ativo || !(await argon2.verify(user.senhaHash, password))) {
      await this.throttle.registerFailure(key);
      throw new UnauthorizedException('Senha incorreta ou acesso indisponível.');
    }
    if (
      user.email.toLowerCase() !== identity.email ||
      (user.googleSubject && user.googleSubject !== identity.sub)
    ) {
      throw new ConflictException('Selecione a conta Google com o mesmo e-mail do seu cadastro.');
    }
    const step = Math.floor(Date.now() / 30_000);
    const hash = createHash('sha256')
      .update(code ?? '')
      .digest('hex');
    const backup = user.twoFactorBackupCodes.includes(hash);
    if (
      user.twoFactorEnabled &&
      (!code ||
        (!backup &&
          (!user.twoFactorSecret ||
            !authenticator.check(code, user.twoFactorSecret) ||
            (user.twoFactorLastUsedStep !== null && user.twoFactorLastUsedStep >= step))))
    ) {
      await this.throttle.registerFailure(key);
      throw new UnauthorizedException(
        'Informe um código de segundo fator válido e ainda não utilizado.',
      );
    }
    try {
      const updated = await this.prisma.client.usuario.updateMany({
        where: {
          id: userId,
          ativo: true,
          email: user.email,
          senhaHash: user.senhaHash,
          googleSubject: user.googleSubject,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorSecret: user.twoFactorSecret,
          twoFactorLastUsedStep: user.twoFactorLastUsedStep,
          twoFactorBackupCodes: { equals: user.twoFactorBackupCodes },
        },
        data: {
          googleSubject: identity.sub,
          ...(user.twoFactorEnabled
            ? {
                twoFactorBackupCodes: backup
                  ? user.twoFactorBackupCodes.filter((v) => v !== hash)
                  : user.twoFactorBackupCodes,
                twoFactorLastUsedStep: backup ? user.twoFactorLastUsedStep : step,
              }
            : {}),
        },
      });
      if (updated.count !== 1)
        throw new ConflictException('O acesso mudou. Atualize a página e tente novamente.');
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esta conta Google já está vinculada a outro usuário.');
      }
      throw error;
    }
    await this.throttle.registerSuccess(key);
    return { linked: true };
  }

  async login(
    dto: LoginDto,
    throttleKey: string,
  ): Promise<AuthResult | { requiresTwoFactor: true; tempToken: string }> {
    // Checagem de throttle ANTES de bater no DB / hash de senha.
    if (await this.throttle.isBlocked(throttleKey)) {
      const retry = await this.throttle.retryAfterSeconds(throttleKey);
      throw new UnauthorizedException({
        code: 'LOGIN_TOO_MANY_ATTEMPTS',
        message: `Muitas tentativas. Tente novamente em ${retry}s.`,
      });
    }

    const usuario = await this.prisma.client.usuario.findUnique({
      where: { email: dto.email },
    });

    // Mensagem genérica para não revelar se o e-mail existe
    if (!usuario || !usuario.ativo) {
      await this.throttle.registerFailure(throttleKey);
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const senhaValida = await argon2.verify(usuario.senhaHash, dto.senha);
    if (!senhaValida) {
      await this.throttle.registerFailure(throttleKey);
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    await this.throttle.registerSuccess(throttleKey);

    this.auditService.registrar({
      empresaId: usuario.empresaId,
      usuarioId: usuario.id,
      acao: 'LOGIN',
      recurso: 'Auth',
    });

    // Se 2FA ativo, não emite JWT completo ainda — retorna um token temporário.
    if (usuario.twoFactorEnabled) {
      const tempToken = await this.tokenService.generateTempToken(usuario.id);
      return { requiresTwoFactor: true, tempToken };
    }

    return this.buildAuthResult(usuario);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const { usuario, newToken, sessionId } =
      await this.tokenService.rotateRefreshToken(refreshToken);
    const accessToken = await this.tokenService.generateAccessToken(usuario, sessionId);
    return { accessToken, refreshToken: newToken, usuario: this.toPublic(usuario) };
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { usuario: { select: { id: true, empresaId: true } } },
    });

    await this.tokenService.revokeRefreshToken(refreshToken);

    if (stored) {
      this.auditService.registrar({
        empresaId: stored.usuario.empresaId,
        usuarioId: stored.usuario.id,
        acao: 'LOGOUT',
        recurso: 'Auth',
      });
    }
  }

  /**
   * Retorna os dados públicos do usuário a partir do `id` contido no JWT.
   * Lança `UnauthorizedException` se o usuário não existir mais
   * (ex: foi desativado/excluído depois do token ser emitido).
   */
  async me(userId: string): Promise<UsuarioPublico> {
    const usuario = await this.prisma.client.usuario.findUnique({
      where: { id: userId },
    });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'Usuário não encontrado',
      });
    }
    return this.toPublic(usuario);
  }

  async listarSessoes(userId: string, currentSessionId: string) {
    const sessoes = await this.prisma.client.authSession.findMany({
      where: { usuarioId: userId, revogado: false, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sessoes.map((sessao) => ({ ...sessao, atual: sessao.id === currentSessionId }));
  }

  async revogarSessao(userId: string, sessionId: string) {
    const [updated] = await this.prisma.client.$transaction([
      this.prisma.client.authSession.updateMany({
        where: { id: sessionId, usuarioId: userId, revogado: false },
        data: { revogado: true },
      }),
      this.prisma.client.refreshToken.updateMany({
        where: { sessionId, usuarioId: userId, revogado: false },
        data: { revogado: true },
      }),
    ]);
    if (!updated.count) throw new NotFoundException('Sessão não encontrada');
    return { success: true };
  }

  /** Retorna os dados de um convite pendente (para a página /aceitar-convite). */
  async obterConvite(token: string) {
    const convite = await this.prisma.client.conviteUsuario.findUnique({ where: { token } });
    if (!convite || convite.usado || convite.expiresAt < new Date()) {
      throw new BadRequestException('Convite inválido ou expirado');
    }
    const empresa = await this.prisma.client.empresa.findUnique({
      where: { id: convite.empresaId },
      select: { nome: true },
    });
    return { email: convite.email, role: convite.role, empresaNome: empresa?.nome ?? '' };
  }

  /** Cria a conta a partir de um convite e marca o convite como usado. */
  async aceitarConvite(dto: { token: string; nome: string; senha: string }) {
    const convite = await this.prisma.client.conviteUsuario.findUnique({
      where: { token: dto.token },
    });
    if (!convite || convite.usado || convite.expiresAt < new Date()) {
      throw new BadRequestException('Convite inválido ou expirado');
    }

    const existente = await this.prisma.client.usuario.findUnique({
      where: { email: convite.email },
    });
    if (existente) throw new ConflictException('E-mail já cadastrado');

    const senhaHash = await argon2.hash(dto.senha, { type: argon2.argon2id });

    await this.prisma.client.$transaction([
      this.prisma.client.usuario.create({
        data: {
          empresaId: convite.empresaId,
          nome: dto.nome,
          email: convite.email,
          senhaHash,
          role: convite.role,
        },
      }),
      this.prisma.client.conviteUsuario.update({
        where: { id: convite.id },
        data: { usado: true },
      }),
    ]);

    return { success: true };
  }

  /** Retorna se o 2FA está ativo para o usuário autenticado. */
  async status2fa(userId: string) {
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado');
    return { enabled: usuario.twoFactorEnabled };
  }

  /** Gera o secret TOTP e o QR code (ainda sem ativar o 2FA). */
  async setup2fa(userId: string) {
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado');
    if (usuario.twoFactorEnabled) {
      throw new BadRequestException('Desative o 2FA antes de configurar um novo autenticador');
    }

    const secret = authenticator.generateSecret();
    const configured = await this.prisma.client.usuario.updateMany({
      where: { id: userId, ativo: true, twoFactorEnabled: false },
      data: { twoFactorSecret: secret },
    });
    if (configured.count !== 1) throw new BadRequestException('Atualize o estado do autenticador');

    const otpauthUrl = authenticator.keyuri(usuario.email, 'Nexly', secret);
    const qrCodeUrl = await toDataURL(otpauthUrl);

    return { qrCodeUrl, secret };
  }

  /** Valida o código TOTP e ativa o 2FA, gerando códigos de backup. */
  async enable2fa(userId: string, code: string, sessionId: string) {
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: userId } });
    if (!usuario || !usuario.twoFactorSecret) {
      throw new BadRequestException('2FA não inicializado');
    }
    if (usuario.twoFactorEnabled) throw new BadRequestException('O 2FA já está ativo');

    const valido = authenticator.check(code, usuario.twoFactorSecret);
    if (!valido) throw new BadRequestException('Código inválido');

    const backupCodes = Array.from({ length: 10 }, () =>
      randomBytes(RECOVERY_CODE_BYTES).toString('hex'),
    );
    const backupHashes = backupCodes.map((c) => createHash('sha256').update(c).digest('hex'));

    await this.prisma.client.$transaction(async (tx) => {
      const enabled = await tx.usuario.updateMany({
        where: {
          id: userId,
          ativo: true,
          twoFactorEnabled: false,
          twoFactorSecret: usuario.twoFactorSecret,
        },
        data: {
          twoFactorEnabled: true,
          twoFactorBackupCodes: backupHashes,
          twoFactorLastUsedStep: Math.floor(Date.now() / 30_000),
        },
      });
      if (enabled.count !== 1)
        throw new BadRequestException('A configuração foi alterada. Atualize a página.');
      await tx.authSession.updateMany({
        where: { usuarioId: userId, id: { not: sessionId }, revogado: false },
        data: { revogado: true },
      });
      await tx.refreshToken.updateMany({
        where: { usuarioId: userId, sessionId: { not: sessionId }, revogado: false },
        data: { revogado: true },
      });
    });

    return { backupCodes };
  }

  /** Desativa o 2FA mediante senha e um segundo fator válido. */
  async disable2fa(userId: string, password: string, code: string) {
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado');

    const senhaValida = await argon2.verify(usuario.senhaHash, password);
    if (!senhaValida) throw new BadRequestException('Senha incorreta');

    const codeHash = createHash('sha256').update(code).digest('hex');
    const step = Math.floor(Date.now() / 30_000);
    const isBackup = usuario.twoFactorBackupCodes.includes(codeHash);
    const isTotp =
      !!usuario.twoFactorSecret &&
      authenticator.check(code, usuario.twoFactorSecret) &&
      (usuario.twoFactorLastUsedStep === null || usuario.twoFactorLastUsedStep < step);
    if (!usuario.twoFactorEnabled || (!isBackup && !isTotp)) {
      throw new BadRequestException(
        'Código inválido ou já utilizado. Aguarde o próximo código do app.',
      );
    }

    const disabled = await this.prisma.client.usuario.updateMany({
      where: {
        id: userId,
        twoFactorEnabled: true,
        senhaHash: usuario.senhaHash,
        twoFactorSecret: usuario.twoFactorSecret,
        twoFactorBackupCodes: { equals: usuario.twoFactorBackupCodes },
        twoFactorLastUsedStep: usuario.twoFactorLastUsedStep,
      },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        twoFactorChallengeHash: null,
        twoFactorChallengeExpiresAt: null,
        twoFactorLastUsedStep: null,
      },
    });
    if (disabled.count !== 1)
      throw new BadRequestException('A configuração foi alterada. Atualize a página.');

    return { success: true };
  }

  /** Verifica o código TOTP/backup e emite o JWT completo. */
  async verify2fa(tempToken: string, code: string): Promise<AuthResult> {
    const { sub, challengeHash } = await this.tokenService.verifyTempToken(tempToken);
    const throttleKey = `2fa|${sub}`;
    if (await this.throttle.isBlocked(throttleKey)) {
      throw new UnauthorizedException(
        'Muitas tentativas de verificação. Tente novamente mais tarde.',
      );
    }
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: sub } });
    if (!usuario || !usuario.ativo || !usuario.twoFactorEnabled) {
      throw new UnauthorizedException('Usuário inválido');
    }
    if (
      usuario.twoFactorChallengeHash !== challengeHash ||
      !usuario.twoFactorChallengeExpiresAt ||
      usuario.twoFactorChallengeExpiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Verificação expirada ou já utilizada. Entre novamente.');
    }

    const codeHash = createHash('sha256').update(code).digest('hex');
    const isBackup = usuario.twoFactorBackupCodes.includes(codeHash);
    const step = Math.floor(Date.now() / 30_000);
    const isTotp =
      !!usuario.twoFactorSecret &&
      authenticator.check(code, usuario.twoFactorSecret) &&
      (usuario.twoFactorLastUsedStep === null || usuario.twoFactorLastUsedStep < step);

    if (!isBackup && !isTotp) {
      await this.throttle.registerFailure(throttleKey);
      throw new UnauthorizedException(
        'Código inválido ou já utilizado. Aguarde o próximo código do app.',
      );
    }

    // CAS único: desafio, código de backup e passo TOTP são consumidos na mesma escrita.
    const consumed = await this.prisma.client.usuario.updateMany({
      where: {
        id: usuario.id,
        ativo: true,
        twoFactorEnabled: true,
        twoFactorSecret: usuario.twoFactorSecret,
        senhaHash: usuario.senhaHash,
        twoFactorChallengeHash: challengeHash,
        twoFactorChallengeExpiresAt: { gt: new Date() },
        twoFactorBackupCodes: { equals: usuario.twoFactorBackupCodes },
        twoFactorLastUsedStep: usuario.twoFactorLastUsedStep,
      },
      data: {
        twoFactorChallengeHash: null,
        twoFactorChallengeExpiresAt: null,
        ...(isBackup
          ? { twoFactorBackupCodes: usuario.twoFactorBackupCodes.filter((c) => c !== codeHash) }
          : { twoFactorLastUsedStep: step }),
      },
    });
    if (consumed.count !== 1)
      throw new UnauthorizedException('Verificação já utilizada. Entre novamente.');
    await this.throttle.registerSuccess(throttleKey);
    return this.buildAuthResult(usuario);
  }

  private async buildAuthResult(usuario: Usuario): Promise<AuthResult> {
    const issued = await this.tokenService.issueRefreshToken(usuario.id);
    const refreshToken = issued.token;
    const accessToken = await this.tokenService.generateAccessToken(usuario, issued.sessionId);
    return { accessToken, refreshToken, usuario: this.toPublic(usuario) };
  }

  private toPublic(usuario: Usuario): UsuarioPublico {
    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
    };
  }
}
