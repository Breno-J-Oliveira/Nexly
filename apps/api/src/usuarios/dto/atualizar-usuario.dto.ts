import { StrictBoolean } from '../../common/validation/strict-boolean';
import { IsEnum, IsString, Length } from 'class-validator';
import { OptionalField } from '../../common/validation/optional-field';
import { TrimText } from '../../common/validation/trim-text';
import { Role } from '@nexly/shared';

export class AtualizarUsuarioDto {
  @OptionalField()
  @TrimText()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @OptionalField()
  @IsEnum(Role)
  role?: Role;

  @OptionalField()
  @StrictBoolean()
  ativo?: boolean;
}
