import { OptionalField } from '../../common/validation/optional-field';
import { TrimText } from '../../common/validation/trim-text';
import { StrictBoolean } from '../../common/validation/strict-boolean';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { TipoCupom } from '@prisma/client';

export class AtualizarCupomDto {
  @OptionalField()
  @TrimText()
  @IsString()
  @Length(1, 60)
  codigo?: string;

  @OptionalField()
  @IsEnum(TipoCupom)
  tipo?: TipoCupom;

  @OptionalField()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  valor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usoMaximo?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  validade?: string;

  @OptionalField()
  @StrictBoolean()
  ativo?: boolean;
}
