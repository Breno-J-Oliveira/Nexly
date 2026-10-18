import { IsInt, IsNumber, Min, IsString, Length, Max } from 'class-validator';
import { TrimText } from '../../common/validation/trim-text';

export class CriarServicoDto {
  @TrimText()
  @IsString()
  @Length(2, 120)
  nome!: string;

  @IsInt()
  @Min(5)
  @Max(480)
  duracaoMin!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  preco!: number;
}
