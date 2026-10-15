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
import { LIMITE_PADRAO } from '../common/pagination/cursor';
import { ClientesService } from './clientes.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { hasPermission, Role } from '@nexly/shared';
type User = { role: Role };
function visivel<T extends { totalGasto: unknown }>(cliente: T, user: User) {
  return hasPermission(user.role, 'vendas:read') ? cliente : { ...cliente, totalGasto: null };
}
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';

@ApiTags('Clientes')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista clientes ativos (offset por page/limit ou keyset por cursor)',
  })
  async listar(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(LIMITE_PADRAO), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
  ) {
    const result = await this.clientesService.listar(page, limit, search, cursor);
    return { ...result, data: result.data.map((cliente) => visivel(cliente, user)) };
  }

  @Get(':id/metricas')
  @ApiOperation({ summary: 'Métricas agregadas de um cliente' })
  @ApiResponse({ status: 200, description: 'Métricas do cliente' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  metricas(@CurrentUser() user: User, @Param('id') id: string) {
    return this.clientesService.metricas(id, hasPermission(user.role, 'vendas:read'));
  }

  @Get(':id/historico')
  @ApiOperation({ summary: 'Histórico de atendimentos de um cliente' })
  @ApiResponse({ status: 200, description: 'Últimos 20 atendimentos' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  historico(@Param('id') id: string) {
    return this.clientesService.historico(id);
  }

  @Get(':id')
  async obter(@CurrentUser() user: User, @Param('id') id: string) {
    return visivel(await this.clientesService.obter(id), user);
  }

  @Post()
  async criar(@CurrentUser() user: User, @Body() dto: CriarClienteDto) {
    return visivel(await this.clientesService.criar(dto), user);
  }

  @Put(':id')
  async atualizar(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AtualizarClienteDto,
  ) {
    return visivel(await this.clientesService.atualizar(id, dto), user);
  }

  @Delete(':id')
  desativar(@Param('id') id: string) {
    return this.clientesService.desativar(id);
  }
}
