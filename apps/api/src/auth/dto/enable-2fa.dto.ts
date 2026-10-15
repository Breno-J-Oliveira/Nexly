import { IsString, Matches } from 'class-validator';
import { AUTHENTICATOR_CODE_PATTERN } from '@nexly/shared';

export class Enable2faDto {
  @IsString()
  @Matches(AUTHENTICATOR_CODE_PATTERN)
  code!: string;
}
