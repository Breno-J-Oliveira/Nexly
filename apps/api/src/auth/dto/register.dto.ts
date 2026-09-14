import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

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
  @IsString()
  @Length(2, 40)
  plano?: string;

  @IsOptional()
  @IsString()
  nomeCartao?: string;

  @IsOptional()
  @IsString()
  numeroCartao?: string;

  @IsOptional()
  @IsString()
  validade?: string;

  @IsOptional()
  @IsString()
  cvv?: string;
}
