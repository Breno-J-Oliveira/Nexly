import { IsEmail, IsEnum } from 'class-validator';
import { Role } from '@nexly/shared';

export class ConvidarUsuarioDto {
  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;
}
