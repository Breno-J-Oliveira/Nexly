import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Role } from '@nexly/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { getTenantContext } from '../database/tenant-context';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @Roles(Role.ADMIN)
  listar() { const ctx = getTenantContext(); return this.service.listar(ctx?.tenantId ?? ''); }

  @Post()
  @Roles(Role.ADMIN)
  criar(@Body() dto: { nome: string; email: string; senha: string; role?: Role }) {
    const ctx = getTenantContext();
    return this.service.criar(ctx?.tenantId ?? '', dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  atualizar(@Param('id') id: string, @Body() dto: { nome?: string; role?: Role; ativo?: boolean }) { return this.service.atualizar(id, dto); }

  @Post(':id/trocar-senha')
  trocarSenha(@Param('id') id: string, @Body() dto: { senhaAtual: string; novaSenha: string }) { return this.service.trocarSenha(id, dto.senhaAtual, dto.novaSenha); }

  @Delete(':id')
  @Roles(Role.ADMIN)
  excluir(@Param('id') id: string) { return this.service.excluir(id); }
}
