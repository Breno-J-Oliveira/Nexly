import { TrimText } from '../../common/validation/trim-text';
import { OptionalField } from '../../common/validation/optional-field';
import { IsOptional, IsString, Length } from 'class-validator';

export class AtualizarProfissionalDto {
  @OptionalField()
  @IsString()
  @Length(2, 120)
  @TrimText()
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  @TrimText({ nullable: true })
  especialidade?: string | null;
}
