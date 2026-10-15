import { StrictBoolean } from '../../common/validation/strict-boolean';
import { IsBusinessHours } from '../../common/validation/business-hours';
import { IsObject, IsOptional, IsString, IsTimeZone, MaxLength } from 'class-validator';

export class AtualizarConfiguracoesDto {
  @IsOptional()
  @IsTimeZone()
  @MaxLength(64)
  fusoHorario?: string;

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
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

  @IsOptional()
  @StrictBoolean()
  lembretesAtivos?: boolean;

  @IsOptional()
  @IsString()
  templateLembrete?: string;
}
