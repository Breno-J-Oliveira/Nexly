import { IsString, Length } from 'class-validator';

export class AceitarConviteDto {
  @IsString()
  token!: string;

  @IsString()
  @Length(2, 120)
  nome!: string;

  @IsString()
  @Length(8, 72)
  senha!: string;
}
