import { IsJWT, IsString, Matches, MaxLength } from 'class-validator';
import { AUTHENTICATOR_CODE_PATTERN } from '@nexly/shared';

export class Enable2faDto {
  @IsString()
  @Matches(AUTHENTICATOR_CODE_PATTERN)
  code!: string;

  @IsJWT()
  @MaxLength(2048)
  setupToken!: string;
}
