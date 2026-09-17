import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CriarAvaliacaoDto {
  @IsString()
  agendamentoId!: string;

  /** NPS de 0 a 10 (mesma escala usada no cálculo do NPS). */
  @IsInt()
  @Min(0)
  @Max(10)
  nota!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
