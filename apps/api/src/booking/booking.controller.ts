import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { BookingService } from './booking.service';

@Controller('booking')
export class BookingController {
  constructor(private readonly service: BookingService) {}

  /* GET /booking/:token — dados publicos da empresa */
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

  /* GET /booking/:token/horarios?data=YYYY-MM-DD&profissionalId=xxx */
  @Get(':token/horarios')
  async horarios(@Param('token') token: string, @Query('data') data: string, @Query('profissionalId') profissionalId: string) {
    return this.service.getHorariosDisponiveis(token, data, profissionalId);
  }

  /* POST /booking/:token/agendar — cria agendamento publico */
  @Post(':token/agendar')
  async agendar(@Param('token') token: string, @Body() body: { servicoId: string; profissionalId: string; dataHora: string; clienteNome: string; clienteTelefone: string; clienteEmail?: string }) {
    return this.service.agendar(token, body);
  }
}
