import { IsBoolean, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class AtualizarFornecedorDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
