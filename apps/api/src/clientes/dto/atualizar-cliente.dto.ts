import { TrimText } from '../../common/validation/trim-text';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class AtualizarClienteDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @TrimText()
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  @TrimText({ nullable: true })
  telefone?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  @TrimText({ nullable: true, lowercase: true })
  email?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  observacoes?: string;
}
