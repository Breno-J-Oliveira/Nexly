import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MODULE_IDS, PRESETS } from '@nexly/shared';

export class WorkspaceDto {
  @IsString()
  @IsIn(PRESETS.map((p) => p.id))
  preset!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MODULE_IDS.length)
  @ArrayUnique()
  @IsIn(MODULE_IDS, { each: true })
  modulos!: string[];
}

export class DepoimentoDto {
  @IsInt()
  @Min(1)
  @Max(5)
  nota!: number;

  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @Length(20, 1000)
  texto!: string;

  @IsString()
  @Length(2, 80)
  nomePublico!: string;

  @IsString()
  @Length(2, 100)
  ocupacao!: string;

  @IsBoolean()
  @Transform(
    ({ obj }: { obj: { autorizaPublicacao?: unknown } }) => obj.autorizaPublicacao === true,
  )
  autorizaPublicacao!: boolean;
}

export class LembreteDto {
  @IsIn(['DEPOIS', 'NUNCA'])
  escolha!: 'DEPOIS' | 'NUNCA';
}
