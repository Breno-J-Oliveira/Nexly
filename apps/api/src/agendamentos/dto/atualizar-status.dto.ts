import { IsEnum } from 'class-validator';
import { StatusAgendamento } from '@nexly/shared';

export class AtualizarStatusDto {
  @IsEnum(StatusAgendamento)
  status!: StatusAgendamento;
}
