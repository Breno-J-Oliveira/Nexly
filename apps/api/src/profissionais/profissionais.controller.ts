import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AtualizarProfissionalDto } from './dto/atualizar-profissional.dto';
import { CriarProfissionalDto } from './dto/criar-profissional.dto';
import { ProfissionaisService } from './profissionais.service';

@Controller('profissionais')
export class ProfissionaisController {
  constructor(private readonly profissionaisService: ProfissionaisService) {}

  @Get()
  listar() {
    return this.profissionaisService.listar();
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.profissionaisService.obter(id);
  }

  @Get(':id/disponibilidade')
  disponibilidade(@Param('id') id: string, @Query('data') data: string) {
    return this.profissionaisService.disponibilidade(id, data);
  }

  @Post()
  criar(@Body() dto: CriarProfissionalDto) {
    return this.profissionaisService.criar(dto);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarProfissionalDto) {
    return this.profissionaisService.atualizar(id, dto);
  }

  @Delete(':id')
  desativar(@Param('id') id: string) {
    return this.profissionaisService.desativar(id);
  }
}
