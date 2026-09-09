import { IsObject, IsOptional, IsString } from 'class-validator';

export class AtualizarConfiguracoesDto {
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
  horarios?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  notificacoes?: Record<string, unknown>;
}