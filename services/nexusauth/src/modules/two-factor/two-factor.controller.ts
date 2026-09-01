import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TwoFactorService } from './two-factor.service';
import { Verify2faDto, verify2faSchema } from './dto/verify-2fa.dto';
import { Disable2faDto, disable2faSchema } from './dto/disable-2fa.dto';
import { Challenge2faDto, challenge2faSchema } from './dto/challenge-2fa.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('2FA')
@Controller('2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private twoFactorService: TwoFactorService) {}

  @Post('setup')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Iniciar configuração 2FA (TOTP)' })
  async setup(@CurrentUser() user: any) {
    return this.twoFactorService.setup(user.sub);
  }

  @Post('verify')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verificar e ativar 2FA' })
  async verify(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(verify2faSchema)) dto: Verify2faDto,
  ) {
    return this.twoFactorService.verify(user.sub, dto);
  }

  @Post('disable')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Desativar 2FA' })
  async disable(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(disable2faSchema)) dto: Disable2faDto,
  ) {
    return this.twoFactorService.disable(user.sub, dto);
  }

  @Public()
  @Post('challenge')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resolver challenge 2FA e obter tokens' })
  async challenge(
    @Body(new ZodValidationPipe(challenge2faSchema)) dto: Challenge2faDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    return this.twoFactorService.challenge(dto, ipAddress, userAgent);
  }
}
