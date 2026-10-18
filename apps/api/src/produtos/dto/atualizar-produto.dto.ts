import { TrimText } from '../../common/validation/trim-text';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { OptionalField } from '../../common/validation/optional-field';

export class AtualizarProdutoDto {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999999.99) custoAtual?:
    number | null;

  @OptionalField()
  @TrimText()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @OptionalField()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  preco?: number;

  @OptionalField()
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
