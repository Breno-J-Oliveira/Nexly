import { IsDateString, IsOptional, IsUUID, Matches } from 'class-validator';
export class DisponibilidadeDto {
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data!: string;

  @IsOptional()
  @IsUUID()
  profissionalId?: string;

  @IsOptional()
  @IsUUID()
  servicoId?: string;
}
