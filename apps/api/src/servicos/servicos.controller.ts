import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AssociarInsumoDto } from './dto/associar-insumo.dto';
import { AtualizarServicoDto } from './dto/atualizar-servico.dto';
import { CriarServicoDto } from './dto/criar-servico.dto';
import { ServicosService } from './servicos.service';

@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Get()
  listar() {
    return this.servicosService.listar();
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.servicosService.obter(id);
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
  listarInsumos(@Param('id') id: string) {
    return this.servicosService.listarInsumos(id);
  }

  @Post(':id/insumos')
  associarInsumo(@Param('id') id: string, @Body() dto: AssociarInsumoDto) {
    return this.servicosService.associarInsumo(id, dto);
  }

  @Delete(':id/insumos/:produtoId')
  removerInsumo(@Param('id') id: string, @Param('produtoId') produtoId: string) {
    return this.servicosService.removerInsumo(id, produtoId);
  }
}
