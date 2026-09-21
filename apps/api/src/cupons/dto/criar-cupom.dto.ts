import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { TipoCupom } from '@prisma/client';

export class CriarCupomDto {
  @IsString()
  @Length(1, 60)
  codigo!: string;

  @IsEnum(TipoCupom)
  tipo!: TipoCupom;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usoMaximo?: number;

  @IsOptional()
  @IsDateString()
  validade?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
