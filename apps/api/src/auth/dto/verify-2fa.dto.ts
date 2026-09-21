import { IsString, Length } from 'class-validator';

export class Verify2faDto {
  @IsString()
  tempToken!: string;

  @IsString()
  @Length(6, 64)
  code!: string;
}
