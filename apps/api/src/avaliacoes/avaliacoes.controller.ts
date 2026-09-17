import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AvaliacoesService } from './avaliacoes.service';
import { CriarAvaliacaoDto } from './dto/criar-avaliacao.dto';

@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly service: AvaliacoesService) {}

  @Post()
  criar(@Body() dto: CriarAvaliacaoDto) {
    return this.service.criar(dto.agendamentoId, dto.nota, dto.comentario);
  }

  /**
   * NPS é sempre calculado para o tenant autenticado — nunca a partir de um
   * `empresaId` arbitrário vindo da URL (isso permitiria ler dados de outra
   * empresa).
   */
  @Get('nps')
  nps(@CurrentUser() user: { empresaId: string }) {
    return this.service.nps(user.empresaId);
  }
}
