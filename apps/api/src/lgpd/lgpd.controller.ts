import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { Role } from '@nexly/shared';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { getTenantContext } from '../database/tenant-context';
import { LgpdService } from './lgpd.service';
import { ConfirmarSenhaLgpdDto, ExcluirContaDto } from './lgpd.dto';

interface UserContext {
  id: string;
}

@Controller('lgpd')
export class LgpdController {
  constructor(private readonly service: LgpdService) {}

  @Get('exportar')
  @Roles(Role.ADMIN)
  async exportar(@Res() res: Response) {
    const ctx = getTenantContext();
    const dados = await this.service.exportar(ctx?.tenantId ?? '');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="nexly-export-${Date.now()}.json"`);
    res.send(JSON.stringify(dados, null, 2));
  }

  @Get('exportar/cliente/:id')
  @Roles(Role.ADMIN)
  async exportarCliente(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const ctx = getTenantContext();
    const dados = await this.service.exportarCliente(ctx?.tenantId ?? '', id);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nexly-cliente-${id.slice(0, 8)}.json"`,
    );
    res.send(JSON.stringify(dados, null, 2));
  }

  @Post('anonimizar/cliente/:id')
  @Roles(Role.ADMIN)
  anonimizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConfirmarSenhaLgpdDto,
    @CurrentUser() user: UserContext,
  ) {
    const ctx = getTenantContext();
    return this.service.anonimizarCliente(ctx?.tenantId ?? '', id, user.id, body.password);
  }

  @Delete('excluir-conta')
  @Roles(Role.ADMIN)
  solicitarExclusao(@Body() body: ExcluirContaDto, @CurrentUser() user: UserContext) {
    const ctx = getTenantContext();
    return this.service.solicitarExclusao(
      ctx?.tenantId ?? '',
      user.id,
      body.password,
      body.confirmacao,
    );
  }

  @Get('status-exclusao')
  @Roles(Role.ADMIN)
  statusExclusao() {
    const ctx = getTenantContext();
    return this.service.statusExclusao(ctx?.tenantId ?? '');
  }

  @Delete('cancelar-exclusao')
  @Roles(Role.ADMIN)
  cancelarExclusao() {
    const ctx = getTenantContext();
    return this.service.cancelarExclusao(ctx?.tenantId ?? '');
  }
}
