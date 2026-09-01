import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import {
  registerSchema,
  RegisterDto,
} from './dto/register.dto';
import { loginSchema, LoginDto } from './dto/login.dto';
import { refreshSchema, RefreshDto } from './dto/refresh.dto';
import { changePasswordSchema, ChangePasswordDto } from './dto/change-password.dto';
import { forgotPasswordSchema, ForgotPasswordDto } from './dto/forgot-password.dto';
import { resetPasswordSchema, ResetPasswordDto } from './dto/reset-password.dto';
import { magicLinkSchema, MagicLinkDto } from './dto/magic-link.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { verifyCaptcha } from '../../common/utils/captcha.util';
import { z } from 'zod';

const verifyTokenSchema = z.object({
  token: z.string().uuid(),
});
type verifyTokenDto = z.infer<typeof verifyTokenSchema>;

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já registrado' })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || 'unknown';
    await this.authService.checkGenericRateLimit(`ratelimit:register:${ipAddress}`, 5, 300);
    // C18 FIX: Rate limit by device fingerprint — prevents botnet bypass.
    // A botnet with 1000 IPs would otherwise create 1000×5=5000 accounts.
    const fingerprint = req.headers['x-device-fingerprint'] as string || ipAddress;
    await this.authService.checkGenericRateLimit(`ratelimit:register:fp:${fingerprint}`, 3, 3600);
    // C18 FIX: Global registration rate limit — caps total registrations system-wide.
    await this.authService.checkGenericRateLimit('ratelimit:register:global', 50, 60);
    // C35 FIX: Verify CAPTCHA token before proceeding with registration.
    // In development without TURNSTILE_SECRET_KEY, verification is skipped (with a warning).
    // In production, this is REQUIRED to prevent bot account creation.
    await verifyCaptcha(dto.captchaToken || '', ipAddress);
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login com email e senha' })
  @ApiResponse({ status: 200, description: 'Tokens de acesso e refresh' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || 'Unknown';
    const device = userAgent.includes('Chrome') ? 'Chrome' :
                  userAgent.includes('Firefox') ? 'Firefox' :
                  userAgent.includes('Safari') ? 'Safari' :
                  userAgent.includes('Edge') ? 'Edge' : 'Unknown Device';
    return this.authService.login(dto, device, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar access token via refresh token' })
  @ApiResponse({ status: 200, description: 'Novos tokens' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || 'unknown';
    await this.authService.checkGenericRateLimit(`ratelimit:refresh:${ipAddress}`, 30, 60);
    return this.authService.refresh(dto);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar link de reset de senha' })
  @ApiResponse({ status: 200, description: 'Email enviado (se existir)' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Resetar senha com token' })
  @ApiResponse({ status: 200, description: 'Senha resetada' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || 'unknown';
    return this.authService.resetPassword(dto, ipAddress);
  }

  @Public()
  @Post('magic-link')
  @ApiOperation({ summary: 'Enviar magic link por email' })
  async magicLink(
    @Body(new ZodValidationPipe(magicLinkSchema)) dto: MagicLinkDto,
  ) {
    return this.authService.magicLink(dto);
  }

  @Public()
  @Post('magic-link/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verificar magic link token' })
  async verifyMagicLink(
    @Body(new ZodValidationPipe(verifyTokenSchema)) dto: { token: string },
    @Req() req: Request,
  ) {
    // V40 FIX: pass ipAddress for rate limit
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return this.authService.verifyMagicLink(dto.token, ipAddress, userAgent);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verificar email com token' })
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyTokenSchema)) dto: { token: string },
    @Req() req: Request,
  ) {
    // V41 FIX: pass ipAddress for rate limit
    const ipAddress = req.ip || 'unknown';
    return this.authService.verifyEmail(dto.token, ipAddress);
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout e revogação de tokens' })
  async logout(@CurrentUser() user: any, @Req() req: Request, @Body() body: { refreshToken?: string }) {
    const token = req.headers.authorization?.substring(7) ?? '';
    return this.authService.logout(user, token, body?.refreshToken);
  }

  @Post('change-password')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Alterar senha (requer autenticação)' })
  async changePassword(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  async me(@CurrentUser() user: any) {
    return this.authService.me(user.sub);
  }
}
