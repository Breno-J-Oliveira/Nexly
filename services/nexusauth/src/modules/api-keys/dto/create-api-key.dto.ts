import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString({ each: true })
  permissions: string[] = [];
}
