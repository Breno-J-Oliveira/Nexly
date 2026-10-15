import { Body, Controller, Delete, Get, Module, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@nexly/shared';
import { ExperienciaService } from './experiencia.service';
import { DepoimentoDto, LembreteDto, WorkspaceDto } from './experiencia.dto';
type User = { id: string; empresaId: string };

@Controller('experiencia')
export class ExperienciaController {
  constructor(private readonly service: ExperienciaService) {}
  @Public() @Get('recomendacoes') publicos() {
    return this.service.publicos();
  }
  @Get() perfil(@CurrentUser() u: User) {
    return this.service.perfil(u.id, u.empresaId);
  }
  @Post('atividade') atividade(@CurrentUser() u: User) {
    return this.service.atividade(u.id, u.empresaId);
  }
  @Roles(Role.ADMIN) @Put('workspace') workspace(
    @CurrentUser() u: User,
    @Body() dto: WorkspaceDto,
  ) {
    return this.service.workspace(u.empresaId, dto);
  }
  @Put('recomendacao') recomendar(@CurrentUser() u: User, @Body() dto: DepoimentoDto) {
    return this.service.recomendar(u.id, u.empresaId, dto);
  }
  @Post('lembrar') lembrar(@CurrentUser() u: User, @Body() dto: LembreteDto) {
    return this.service.lembrar(u.id, u.empresaId, dto.escolha);
  }
  @Delete('recomendacao') retirar(@CurrentUser() u: User) {
    return this.service.retirar(u.id, u.empresaId);
  }
}
@Module({ controllers: [ExperienciaController], providers: [ExperienciaService] })
export class ExperienciaModule {}
