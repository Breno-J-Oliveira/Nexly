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

export class CriarCupomDto {
  @TrimText()
  @IsString()
  @Length(1, 60)
  codigo!: string;

  @IsEnum(TipoCupom)
  tipo!: TipoCupom;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  valor!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usoMaximo?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  validade?: string;

  @IsOptional()
  @StrictBoolean()
  ativo?: boolean;
}
