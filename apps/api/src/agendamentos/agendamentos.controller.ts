import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { StatusAgendamento } from '@nexly/shared';
import { AgendamentosService } from './agendamentos.service';
import { AtualizarStatusDto } from './dto/atualizar-status.dto';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';

@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentosService: AgendamentosService) {}

  @Get()
  listar(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('data') data?: string,
    @Query('profissionalId') profissionalId?: string,
    @Query('clienteId') clienteId?: string,
    @Query('status') status?: StatusAgendamento,
  ) {
    return this.agendamentosService.listar(page, limit, {
      data,
      profissionalId,
      clienteId,
      status,
    });
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.agendamentosService.obter(id);
  }

  @Post()
  criar(@Body() dto: CriarAgendamentoDto) {
    return this.agendamentosService.criar(dto);
  }

  @Patch(':id/status')
  atualizarStatus(@Param('id') id: string, @Body() dto: AtualizarStatusDto) {
    return this.agendamentosService.atualizarStatus(id, dto.status);
  }

  @Delete(':id')
  cancelar(@Param('id') id: string) {
    return this.agendamentosService.atualizarStatus(id, 'CANCELADO');
  }
}

