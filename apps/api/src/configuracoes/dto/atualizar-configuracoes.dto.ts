import { StrictBoolean } from '../../common/validation/strict-boolean';
import { IsBusinessHours } from '../../common/validation/business-hours';
import { OptionalField } from '../../common/validation/optional-field';
import { TrimText } from '../../common/validation/trim-text';
import { IsObject, IsOptional, IsString, IsTimeZone, Length, MaxLength } from 'class-validator';

export class AtualizarConfiguracoesDto {
  @OptionalField()
  @IsTimeZone()
  @MaxLength(64)
  fusoHorario?: string;

  @OptionalField()
  @TrimText()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @OptionalField()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  emailContato?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsObject()
  @IsBusinessHours()
  horarios?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  notificacoes?: Record<string, unknown>;

  @OptionalField()
  @StrictBoolean()
  lembretesAtivos?: boolean;

  @IsOptional()
  @IsString()
  templateLembrete?: string;
}
