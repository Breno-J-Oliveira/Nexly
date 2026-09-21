import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AtualizarCupomDto } from './dto/atualizar-cupom.dto';
import { CriarCupomDto } from './dto/criar-cupom.dto';
import { ValidarCupomDto } from './dto/validar-cupom.dto';
import { CuponsService } from './cupons.service';

@Controller('cupons')
export class CuponsController {
  constructor(private readonly service: CuponsService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Post()
  criar(@Body() dto: CriarCupomDto) {
    return this.service.criar(dto);
  }

  @Post('validar')
  validar(@Body() dto: ValidarCupomDto) {
    return this.service.validar(dto.codigo);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarCupomDto) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  excluir(@Param('id') id: string) {
    return this.service.excluir(id);
  }
}
