import { IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CriarServicoDto {
  @IsString()
  @Length(2, 120)
  nome!: string;

  @IsInt()
  @Min(5)
  @Max(480)
  duracaoMin!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  preco!: number;
}
