import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { authenticator } from '@otplib/preset-default';
import { Usuario } from '@prisma/client';
import { Plano } from '@prisma/client';
import { Role, UsuarioPublico, validarCnpj } from '@nexly/shared';
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

  async register(dto: RegisterDto, ip?: string): Promise<AuthResult> {
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
        plano: (dto.plano?.toUpperCase() as Plano) ?? Plano.FREE,
        dadosPagamento: dto.nomeCartao
          ? {
              nomeCartao: dto.nomeCartao,
              numeroCartao: dto.numeroCartao ? dto.numeroCartao.slice(-4) : undefined,
              validade: dto.validade,
              // CVV é verificado no gateway, mas NUNCA persistido (PCI-DSS).
            }
          : undefined,
        usuarios: {
          create: {
            nome: dto.responsavelNome,
            email: dto.email,
            senhaHash,
            role: Role.ADMIN,
          },
        },
      },
      include: { usuarios: true },
    });

    const usuario = empresa.usuarios[0];
    if (!usuario) {
      throw new InternalServerErrorException('Falha ao criar usuário administrador');
    }

    // Registra o aceite dos Termos de Uso (LGPD).
    await this.prisma.client.termoAceite.create({
      data: { usuarioId: usuario.id, versao: '1.0', ip: ip ?? null },
    });

    return this.buildAuthResult(usuario);
  }

  async login(
    dto: LoginDto,
    throttleKey: string,
  ): Promise<AuthResult | { requiresTwoFactor: true; tempToken: string }> {
    // Checagem de throttle ANTES de bater no DB / hash de senha.
    if (this.throttle.isBlocked(throttleKey)) {
      const retry = this.throttle.retryAfterSeconds(throttleKey);
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
      this.throttle.registerFailure(throttleKey);
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const senhaValida = await argon2.verify(usuario.senhaHash, dto.senha);
    if (!senhaValida) {
      this.throttle.registerFailure(throttleKey);
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    this.throttle.registerSuccess(throttleKey);

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
    const { usuario, newToken } = await this.tokenService.rotateRefreshToken(refreshToken);
    const accessToken = await this.tokenService.generateAccessToken(usuario);
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
    if (!usuario) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'Usuário não encontrado',
      });
    }
    return this.toPublic(usuario);
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

    const secret = authenticator.generateSecret();
    await this.prisma.client.usuario.updateMany({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const otpauthUrl = authenticator.keyuri(usuario.email, 'Nexly', secret);
    const qrCodeUrl = await toDataURL(otpauthUrl);

    return { qrCodeUrl, secret };
  }

  /** Valida o código TOTP e ativa o 2FA, gerando códigos de backup. */
  async enable2fa(userId: string, code: string) {
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: userId } });
    if (!usuario || !usuario.twoFactorSecret) {
      throw new BadRequestException('2FA não inicializado');
    }

    const valido = authenticator.check(code, usuario.twoFactorSecret);
    if (!valido) throw new BadRequestException('Código inválido');

    const backupCodes = Array.from({ length: 10 }, () => randomBytes(4).toString('hex'));
    const backupHashes = backupCodes.map((c) => createHash('sha256').update(c).digest('hex'));

    await this.prisma.client.usuario.updateMany({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorBackupCodes: backupHashes },
    });

    return { backupCodes };
  }

  /** Desativa o 2FA (requer a senha atual). */
  async disable2fa(userId: string, password: string) {
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado');

    const senhaValida = await argon2.verify(usuario.senhaHash, password);
    if (!senhaValida) throw new BadRequestException('Senha incorreta');

    await this.prisma.client.usuario.updateMany({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
    });

    return { success: true };
  }

  /** Verifica o código TOTP/backup e emite o JWT completo. */
  async verify2fa(tempToken: string, code: string): Promise<AuthResult> {
    const { sub } = await this.tokenService.verifyTempToken(tempToken);
    const usuario = await this.prisma.client.usuario.findUnique({ where: { id: sub } });
    if (!usuario || !usuario.twoFactorEnabled) {
      throw new UnauthorizedException('Usuário inválido');
    }

    const codeHash = createHash('sha256').update(code).digest('hex');
    const isBackup = usuario.twoFactorBackupCodes.includes(codeHash);
    const isTotp = !!usuario.twoFactorSecret && authenticator.check(code, usuario.twoFactorSecret);

    if (!isBackup && !isTotp) {
      throw new UnauthorizedException('Código inválido');
    }

    // Código de backup é de uso único: remove após uso.
    if (isBackup) {
      const restantes = usuario.twoFactorBackupCodes.filter((c) => c !== codeHash);
      await this.prisma.client.usuario.updateMany({
        where: { id: usuario.id },
        data: { twoFactorBackupCodes: restantes },
      });
    }

    return this.buildAuthResult(usuario);
  }

  private async buildAuthResult(usuario: Usuario): Promise<AuthResult> {
    const accessToken = await this.tokenService.generateAccessToken(usuario);
    const refreshToken = await this.tokenService.issueRefreshToken(usuario.id);
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
