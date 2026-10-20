import { TrimText } from '../../common/validation/trim-text';
import { OptionalField } from '../../common/validation/optional-field';
import { IsNumber, IsOptional, IsString, Length, Min, Max } from 'class-validator';

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

  @OptionalField()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  comissaoPercentual?: number;
}
