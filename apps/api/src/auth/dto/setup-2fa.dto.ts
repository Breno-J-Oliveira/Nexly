import { IsString, Length } from 'class-validator';

export class Setup2faDto {
  @IsString()
  @Length(1, 128)
  password!: string;
}
