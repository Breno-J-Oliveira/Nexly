import { IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class AtualizarProdutoDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  preco?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estoqueMinimo?: number;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  categoria?: string;
}
