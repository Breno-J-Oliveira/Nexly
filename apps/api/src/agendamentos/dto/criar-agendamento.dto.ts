import { IsDateString, IsUUID, Matches } from 'class-validator';

export class CriarAgendamentoDto {
  @IsUUID()
  clienteId!: string;

  @IsUUID()
  profissionalId!: string;

  @IsUUID()
  servicoId!: string;

  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'Informe data e horário com fuso horário',
  })
  dataHora!: string;
}
