import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Role } from '@nexly/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { getTenantIdOrFail } from '../database/tenant-context';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { ConvidarUsuarioDto } from './dto/convidar-usuario.dto';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @Roles(Role.ADMIN)
  listar() {
    return this.service.listar(getTenantIdOrFail());
  }

  @Post()
  @Roles(Role.ADMIN)
  criar(@Body() dto: CriarUsuarioDto) {
    return this.service.criar(getTenantIdOrFail(), dto);
  }

  @Post('convidar')
  @Roles(Role.ADMIN)
  convidar(@Body() dto: ConvidarUsuarioDto) {
    return this.service.convidar(getTenantIdOrFail(), dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  atualizar(@Param('id') id: string, @Body() dto: AtualizarUsuarioDto) {
    return this.service.atualizar(getTenantIdOrFail(), id, dto);
  }

  @Post('trocar-senha')
  trocarSenha(@CurrentUser() user: { id: string }, @Body() dto: TrocarSenhaDto) {
    return this.service.trocarSenha(user.id, dto.senhaAtual, dto.novaSenha);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  excluir(@Param('id') id: string) {
    return this.service.excluir(getTenantIdOrFail(), id);
  }
}
