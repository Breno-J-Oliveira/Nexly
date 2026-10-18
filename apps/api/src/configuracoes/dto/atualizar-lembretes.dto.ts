import { StrictBoolean } from '../../common/validation/strict-boolean';
import { OptionalField } from '../../common/validation/optional-field';
import { IsOptional, IsString } from 'class-validator';

export class AtualizarLembretesDto {
  @OptionalField()
  @StrictBoolean()
  lembretesAtivos?: boolean;

  @IsOptional()
  @IsString()
  templateLembrete?: string;
}
