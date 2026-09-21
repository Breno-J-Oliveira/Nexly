import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { env } from '../config/env';
import { AuthService } from './auth.service';
import { AceitarConviteDto } from './dto/aceitar-convite.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';

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

function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.ip ?? 'unknown';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = getClientIp(req);
    const result = await this.authService.register(dto, ip);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, usuario: result.usuario };
  }

  @Public()
  @Get('aceitar-convite')
  async obterConvite(@Query('token') token?: string) {
    if (!token) throw new BadRequestException('Token ausente');
    return this.authService.obterConvite(token);
  }

  @Public()
  @Post('aceitar-convite')
  async aceitarConvite(@Body() dto: AceitarConviteDto) {
    return this.authService.aceitarConvite(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = getClientIp(req);
    const key = `${dto.email.toLowerCase()}|${ip}`;
    const result = await this.authService.login(dto, key);

    if (result.requiresTwoFactor) {
      return { requiresTwoFactor: true, tempToken: result.tempToken };
    }

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

  @Get('me')
  async me(@CurrentUser() user: { id: string }) {
    return this.authService.me(user.id);
  }

  @Get('2fa/setup')
  async setup2fa(@CurrentUser() user: { id: string }) {
    return this.authService.setup2fa(user.id);
  }

  @Get('2fa/status')
  async status2fa(@CurrentUser() user: { id: string }) {
    return this.authService.status2fa(user.id);
  }

  @Post('2fa/enable')
  async enable2fa(@CurrentUser() user: { id: string }, @Body() dto: Enable2faDto) {
    return this.authService.enable2fa(user.id, dto.code);
  }

  @Post('2fa/disable')
  async disable2fa(@CurrentUser() user: { id: string }, @Body() dto: Disable2faDto) {
    return this.authService.disable2fa(user.id, dto.password);
  }

  @Public()
  @HttpCode(200)
  @Post('2fa/verify')
  async verify2fa(@Body() dto: Verify2faDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verify2fa(dto.tempToken, dto.code);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, usuario: result.usuario };
  }

  private cookieOptions(): CookieOptions {
    const options: CookieOptions = {
      httpOnly: true,
      // Secure em produção (HTTPS). É obrigatório quando sameSite='none'.
      secure: env.NODE_ENV === 'production',
      // Em produção, front (Vercel) e API (Railway) ficam em origens diferentes.
      // sameSite='none' permite o cookie do refresh trafegar cross-site.
      // Em dev, 'lax' é suficiente e mais seguro.
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    };
    if (env.COOKIE_DOMAIN) {
      // Ex.: '.nexly.com.br' quando front e API compartilham o domínio raiz.
      options.domain = env.COOKIE_DOMAIN;
    }
    return options;
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: REFRESH_TTL_MS,
    });
  }

  private clearRefreshCookie(res: Response): void {
    // Espelha path/domain/sameSite/secure para o navegador de fato remover
    // o cookie (senão os atributos não "casam" e ele não é apagado).
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }
}
