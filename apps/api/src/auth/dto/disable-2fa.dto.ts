import { IsString, MinLength } from 'class-validator';

export class Disable2faDto {
  @IsString()
  @MinLength(1)
  password!: string;
}
