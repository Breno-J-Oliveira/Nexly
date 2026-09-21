import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

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

  @IsOptional()
  @IsDateString()
  dataVencimento?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  lote?: string;
}
