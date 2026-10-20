import { TrimText } from '../../common/validation/trim-text';
import { IsNumber, IsOptional, IsString, Length, Min, Max } from 'class-validator';
import { OptionalField } from '../../common/validation/optional-field';

export class CriarProfissionalDto {
  @IsString()
  @Length(2, 120)
  @TrimText()
  nome!: string;

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
