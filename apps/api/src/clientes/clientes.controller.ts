import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  listar(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.clientesService.listar(page, limit, search);
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.clientesService.obter(id);
  }

  @Post()
  criar(@Body() dto: CriarClienteDto) {
    return this.clientesService.criar(dto);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarClienteDto) {
    return this.clientesService.atualizar(id, dto);
  }

  @Delete(':id')
  desativar(@Param('id') id: string) {
    return this.clientesService.desativar(id);
  }
}
