import { TrimText } from '../../common/validation/trim-text';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class AtualizarProdutoDto {
  @IsOptional()
  @TrimText()
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
  @TrimText({ nullable: true })
  @IsString()
  @Length(2, 60)
  categoria?: string | null;

  @IsOptional()
  @TrimText({ nullable: true })
  @IsDateString({ strict: true })
  dataVencimento?: string | null;

  @IsOptional()
  @TrimText({ nullable: true })
  @IsString()
  @Length(1, 60)
  lote?: string | null;
}
