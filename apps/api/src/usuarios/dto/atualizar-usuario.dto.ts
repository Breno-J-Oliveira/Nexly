import { StrictBoolean } from '../../common/validation/strict-boolean';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Role } from '@nexly/shared';

export class AtualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @StrictBoolean()
  ativo?: boolean;
}
