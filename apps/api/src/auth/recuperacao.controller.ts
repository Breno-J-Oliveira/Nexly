import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { TrimText } from '../common/validation/trim-text';
import { RecuperacaoService } from './recuperacao.service';
class SolicitarDto {
  @TrimText({ lowercase: true }) @IsEmail() @Length(3, 254) email!: string;
}
class RedefinirDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @IsString() @Length(12, 72) @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/) senha!: string;
}
@Public()
@Controller('auth/recuperacao')
export class RecuperacaoController {
  constructor(private readonly service: RecuperacaoService) {}
  @Get('status') status() {
    return { disponivel: this.service.disponivel() };
  }
  @Post('solicitar') solicitar(@Body() dto: SolicitarDto, @Req() req: Request) {
    return this.service.solicitar(dto.email, req.ip ?? 'unknown');
  }
  @Post('redefinir') redefinir(@Body() dto: RedefinirDto, @Req() req: Request) {
    return this.service.redefinir(dto.token, dto.senha, req.ip ?? 'unknown');
  }
}
