import { IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class AtualizarServicoDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  duracaoMin?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  preco?: number;
}
