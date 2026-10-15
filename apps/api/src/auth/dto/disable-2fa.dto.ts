import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { TWO_FACTOR_CODE_PATTERN } from '@nexly/shared';

export class Disable2faDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  @IsString()
  @Matches(TWO_FACTOR_CODE_PATTERN)
  code!: string;
}
