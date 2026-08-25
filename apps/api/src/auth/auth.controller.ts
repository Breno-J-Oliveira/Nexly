import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { env } from '../config/env';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const entry = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, usuario: result.usuario };
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // A chave do throttle combina email + IP — assim um atacante
    // distribuindo tentativas em vários IPs não consegue isolar a conta,
    // e contas diferentes atrás do mesmo NAT não se bloqueiam mutuamente.
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const key = `${dto.email.toLowerCase()}|${ip}`;
    const result = await this.authService.login(dto, key);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, usuario: result.usuario };
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getCookie(req, REFRESH_COOKIE);
    if (!refreshToken) {
      return { accessToken: null, usuario: null };
    }
    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, usuario: result.usuario };
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getCookie(req, REFRESH_COOKIE);
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.clearRefreshCookie(res);
    return { success: true };
  }

  /**
   * Retorna os dados do usuário autenticado (a partir do JWT).
   * Útil para o front-end carregar nome, role, empresaId sem ter que
   * decodificar o access token manualmente.
   */
  @Get('me')
  async me(@CurrentUser() user: { sub: string }) {
    return this.authService.me(user.sub);
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TTL_MS,
      path: '/',
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }
}
