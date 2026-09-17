import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { BookingService } from './booking.service';
import { AgendarPublicoDto } from './dto/agendar-publico.dto';

/**
 * Página pública de agendamento (sem login). O `@Public()` é obrigatório:
 * o `AuthGuard` é global e bloquearia estas rotas com 401.
 */
@Public()
@Controller('booking')
export class BookingController {
  constructor(private readonly service: BookingService) {}

  /* GET /booking/:token — dados publicos da empresa + horarios de funcionamento */
  @Get(':token')
  async empresa(@Param('token') token: string) {
    return this.service.getEmpresa(token);
  }

  /* GET /booking/:token/servicos */
  @Get(':token/servicos')
  async servicos(@Param('token') token: string) {
    return this.service.getServicos(token);
  }

  /* GET /booking/:token/profissionais */
  @Get(':token/profissionais')
  async profissionais(@Param('token') token: string) {
    return this.service.getProfissionais(token);
  }

  /* GET /booking/:token/disponibilidade?data=YYYY-MM-DD&profissionalId=xxx&servicoId=xxx */
  @Get(':token/disponibilidade')
  async disponibilidade(
    @Param('token') token: string,
    @Query('data') data: string,
    @Query('profissionalId') profissionalId?: string,
    @Query('servicoId') servicoId?: string,
  ) {
    return this.service.getDisponibilidade(token, data, profissionalId, servicoId);
  }

  /* GET /booking/:token/horarios?data=YYYY-MM-DD&profissionalId=xxx */
  @Get(':token/horarios')
  async horarios(@Param('token') token: string, @Query('data') data: string, @Query('profissionalId') profissionalId: string) {
    return this.service.getHorariosDisponiveis(token, data, profissionalId);
  }

  /* POST /booking/:token/agendar — cria agendamento publico */
  @Post(':token/agendar')
  async agendar(@Param('token') token: string, @Body() dto: AgendarPublicoDto) {
    return this.service.agendar(token, dto);
  }

  /* POST /booking/:token — alias usado pela página pública */
  @Post(':token')
  async agendarNaRaiz(@Param('token') token: string, @Body() dto: AgendarPublicoDto) {
    return this.service.agendar(token, dto);
  }
}
