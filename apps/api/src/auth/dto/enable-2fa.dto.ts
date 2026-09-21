import { IsString, Length } from 'class-validator';

export class Enable2faDto {
  @IsString()
  @Length(6, 8)
  code!: string;
}
