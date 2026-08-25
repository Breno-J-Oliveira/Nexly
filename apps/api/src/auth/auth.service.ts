import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Usuario } from '@prisma/client';
import { Role, UsuarioPublico, validarCnpj } from '@nexly/shared';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginThrottleService } from './login-throttle.service';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioPublico;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly throttle: LoginThrottleService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
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

    return this.buildAuthResult(usuario);
  }

  async login(dto: LoginDto, throttleKey: string): Promise<AuthResult> {
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

    return this.buildAuthResult(usuario);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const { usuario, newToken } = await this.tokenService.rotateRefreshToken(refreshToken);
    const accessToken = await this.tokenService.generateAccessToken(usuario);
    return { accessToken, refreshToken: newToken, usuario: this.toPublic(usuario) };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
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
