import { TrimText } from '../../common/validation/trim-text';
import { IsEmail, IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Role } from '@nexly/shared';

export class CriarUsuarioDto {
  @IsString()
  @Length(2, 120)
  @TrimText()
  nome!: string;

  @IsEmail()
  @TrimText({ lowercase: true })
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(8, 72)
  senha!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
