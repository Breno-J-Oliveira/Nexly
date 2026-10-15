import { StrictBoolean } from '../../common/validation/strict-boolean';
import { IsOptional, IsString } from 'class-validator';

export class AtualizarLembretesDto {
  @IsOptional()
  @StrictBoolean()
  lembretesAtivos?: boolean;

  @IsOptional()
  @IsString()
  templateLembrete?: string;
}
