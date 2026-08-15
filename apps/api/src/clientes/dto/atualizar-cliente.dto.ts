import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class AtualizarClienteDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
