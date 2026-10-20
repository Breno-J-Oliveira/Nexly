import { IsString, IsUUID, Length } from 'class-validator';

export class ConviteTokenDto {
  @IsUUID('4')
  token!: string;
}

export class AceitarConviteDto extends ConviteTokenDto {
  @IsString()
  @Length(2, 120)
  nome!: string;

  @IsString()
  @Length(8, 72)
  senha!: string;
}
