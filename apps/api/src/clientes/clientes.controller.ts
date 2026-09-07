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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';

@ApiTags('Clientes')
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

  @Get(':id/metricas')
  @ApiOperation({ summary: 'Métricas agregadas de um cliente' })
  @ApiResponse({ status: 200, description: 'Métricas do cliente' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  metricas(@Param('id') id: string) {
    return this.clientesService.metricas(id);
  }

  @Get(':id/historico')
  @ApiOperation({ summary: 'Histórico de atendimentos de um cliente' })
  @ApiResponse({ status: 200, description: 'Últimos 20 atendimentos' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  historico(@Param('id') id: string) {
    return this.clientesService.historico(id);
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
