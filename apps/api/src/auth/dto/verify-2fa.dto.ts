import { IsString, MaxLength, Matches } from 'class-validator';
import { TWO_FACTOR_CODE_PATTERN } from '@nexly/shared';

export class Verify2faDto {
  @IsString()
  @MaxLength(2048)
  tempToken!: string;

  @IsString()
  @Matches(TWO_FACTOR_CODE_PATTERN)
  code!: string;
}
