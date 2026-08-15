import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { AuthUser, Role } from '@nexly/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(Role.ADMIN)
  listar(@CurrentUser() user: AuthUser) {
    return this.usuariosService.listar(user.empresaId);
  }

  @Post()
  @Roles(Role.ADMIN)
  criar(@CurrentUser() user: AuthUser, @Body() dto: CriarUsuarioDto) {
    return this.usuariosService.criar(user.empresaId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AtualizarUsuarioDto,
  ) {
    return this.usuariosService.atualizar(user.empresaId, user.id, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  desativar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usuariosService.desativar(user.empresaId, user.id, id);
  }

  @Patch(':id/senha')
  trocarSenha(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TrocarSenhaDto) {
    if (id !== user.id) {
      throw new ForbiddenException('Você só pode alterar a própria senha');
    }
    return this.usuariosService.trocarSenha(user.id, dto);
  }
}
