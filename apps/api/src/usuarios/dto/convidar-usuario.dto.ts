import { TrimText } from '../../common/validation/trim-text';
import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { Role } from '@nexly/shared';

export class ConvidarUsuarioDto {
  @IsEmail()
  @TrimText({ lowercase: true })
  @MaxLength(254)
  email!: string;

  @IsEnum(Role)
  role!: Role;
}
