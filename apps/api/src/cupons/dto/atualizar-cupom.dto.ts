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

export class AtualizarCupomDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  codigo?: string;

  @IsOptional()
  @IsEnum(TipoCupom)
  tipo?: TipoCupom;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor?: number;

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
