import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MODULE_IDS, PRESETS } from '@nexly/shared';

const PLANOS_PERMITIDOS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] as const;

export class RegisterDto {
  @IsOptional()
  @IsIn(PRESETS.map((p) => p.id))
  preset?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MODULE_IDS.length)
  @ArrayUnique()
  @IsIn(MODULE_IDS, { each: true })
  modulos?: string[];
  @IsString()
  @Length(2, 120)
  empresaNome!: string;

  @IsString()
  @Length(14, 18)
  cnpj!: string;

  @IsString()
  @Length(2, 120)
  responsavelNome!: string;

  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @MaxLength(254) // RFC 5321
  email!: string;

  @IsString()
  @Length(8, 72)
  senha!: string;

  @IsOptional()
  @IsString()
  @Length(10, 16)
  telefone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  segmento?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  cidade?: string;

  @IsOptional()
  @IsIn(PLANOS_PERMITIDOS)
  plano?: string;

  @IsBoolean()
  @Transform(({ obj }: { obj: { aceitouTermos?: unknown } }) => obj.aceitouTermos === true)
  @Equals(true, { message: 'É necessário aceitar os Termos de Uso e a Política de Privacidade' })
  aceitouTermos!: boolean;
}
