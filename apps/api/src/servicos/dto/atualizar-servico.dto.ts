import { IsInt, IsNumber, IsString, Length, Max, Min } from 'class-validator';
import { OptionalField } from '../../common/validation/optional-field';
import { TrimText } from '../../common/validation/trim-text';

export class AtualizarServicoDto {
  @OptionalField()
  @TrimText()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @OptionalField()
  @IsInt()
  @Min(5)
  @Max(480)
  duracaoMin?: number;

  @OptionalField()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  preco?: number;
}
