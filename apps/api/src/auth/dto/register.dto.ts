import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const PLANOS_PERMITIDOS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] as const;

export class RegisterDto {
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

  // Dados de pagamento: NUNCA armazenamos CVV — é descartado.
  @IsOptional()
  @IsString()
  @Length(2, 120)
  nomeCartao?: string;

  @IsOptional()
  @IsString()
  @Length(13, 19)
  numeroCartao?: string;

  @IsOptional()
  @IsString()
  @Length(4, 5)
  validade?: string;

  @IsOptional()
  @IsString()
  @Length(3, 4)
  cvv?: string;
}
