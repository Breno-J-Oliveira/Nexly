import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Role } from '@nexly/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { getTenantContext } from '../database/tenant-context';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @Roles(Role.ADMIN)
  listar() { const ctx = getTenantContext(); return this.service.listar(ctx?.tenantId ?? ''); }

  @Post()
  @Roles(Role.ADMIN)
  criar(@Body() dto: CriarUsuarioDto) {
    const ctx = getTenantContext();
    return this.service.criar(ctx?.tenantId ?? '', dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  atualizar(@Param('id') id: string, @Body() dto: AtualizarUsuarioDto) { return this.service.atualizar(id, dto); }

  @Post(':id/trocar-senha')
  trocarSenha(@Param('id') id: string, @Body() dto: TrocarSenhaDto) { return this.service.trocarSenha(id, dto.senhaAtual, dto.novaSenha); }

  @Delete(':id')
  @Roles(Role.ADMIN)
  excluir(@Param('id') id: string) { return this.service.excluir(id); }
}
