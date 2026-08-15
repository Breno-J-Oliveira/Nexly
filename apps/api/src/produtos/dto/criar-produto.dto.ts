import { IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CriarProdutoDto {
  @IsString()
  @Length(2, 120)
  nome!: string;

  @IsString()
  @Length(2, 60)
  sku!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  preco!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estoqueAtual?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estoqueMinimo?: number;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  categoria?: string;
}
