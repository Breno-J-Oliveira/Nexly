import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AssociarInsumoDto } from './dto/associar-insumo.dto';
import { AtualizarServicoDto } from './dto/atualizar-servico.dto';
import { CriarServicoDto } from './dto/criar-servico.dto';
import { ServicosService } from './servicos.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { hasPermission, Role } from '@nexly/shared';

@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Get()
  listar() {
    return this.servicosService.listar();
  }

  @Get(':id')
  obter(@Param('id') id: string, @CurrentUser() user: { role: Role }) {
    return this.servicosService.obter(id, hasPermission(user.role, 'estoque:read'));
  }

  @Post()
  criar(@Body() dto: CriarServicoDto) {
    return this.servicosService.criar(dto);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarServicoDto) {
    return this.servicosService.atualizar(id, dto);
  }

  @Delete(':id')
  desativar(@Param('id') id: string) {
    return this.servicosService.desativar(id);
  }

  // ── Insumos por serviço ──────────────────────────────────

  @Get(':id/insumos')
  @Roles(Role.ADMIN, Role.GESTOR)
  listarInsumos(@Param('id') id: string) {
    return this.servicosService.listarInsumos(id);
  }

  @Post(':id/insumos')
  @Roles(Role.ADMIN, Role.GESTOR)
  associarInsumo(@Param('id') id: string, @Body() dto: AssociarInsumoDto) {
    return this.servicosService.associarInsumo(id, dto);
  }

  @Delete(':id/insumos/:produtoId')
  @Roles(Role.ADMIN, Role.GESTOR)
  removerInsumo(@Param('id') id: string, @Param('produtoId') produtoId: string) {
    return this.servicosService.removerInsumo(id, produtoId);
  }
}
