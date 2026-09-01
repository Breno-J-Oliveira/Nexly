import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  // V53 FIX: disallow consecutive hyphens and leading/trailing hyphens
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters/numbers with single hyphens (no leading/trailing or consecutive hyphens)',
  })
  slug!: string;
}
