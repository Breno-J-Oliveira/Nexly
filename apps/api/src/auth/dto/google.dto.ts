import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { TWO_FACTOR_CODE_PATTERN } from '@nexly/shared';
import { RegisterDto } from './register.dto';

export class GoogleCredentialDto {
  @IsString()
  @Length(100, 8192)
  credential!: string;
}

export class GoogleLinkDto extends GoogleCredentialDto {
  @IsString()
  @Length(1, 128)
  senha!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(TWO_FACTOR_CODE_PATTERN)
  code?: string;
}

export class GoogleRegisterDto extends RegisterDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  registrationToken!: string;
}
