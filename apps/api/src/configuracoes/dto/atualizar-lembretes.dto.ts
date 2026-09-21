import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AtualizarLembretesDto {
  @IsOptional()
  @IsBoolean()
  lembretesAtivos?: boolean;

  @IsOptional()
  @IsString()
  templateLembrete?: string;
}
