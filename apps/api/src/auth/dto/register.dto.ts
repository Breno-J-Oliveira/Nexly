import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

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
}
