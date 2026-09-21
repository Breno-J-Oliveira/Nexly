import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AtualizarFornecedorDto } from './dto/atualizar-fornecedor.dto';
import { CriarFornecedorDto } from './dto/criar-fornecedor.dto';
import { FornecedoresService } from './fornecedores.service';

@Controller('fornecedores')
export class FornecedoresController {
  constructor(private readonly service: FornecedoresService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Post()
  criar(@Body() dto: CriarFornecedorDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarFornecedorDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  excluir(@Param('id') id: string) {
    return this.service.excluir(id);
  }
}
