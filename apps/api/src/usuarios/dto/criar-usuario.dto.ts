import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Role } from '@nexly/shared';

export class CriarUsuarioDto {
  @IsString()
  @Length(2, 120)
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 72)
  senha!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
