import { IsDateString, IsString } from 'class-validator';

export class CriarAgendamentoDto {
  @IsString()
  clienteId!: string;

  @IsString()
  profissionalId!: string;

  @IsString()
  servicoId!: string;

  @IsDateString()
  dataHora!: string;
}
