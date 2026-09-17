import { IsString, Length, MaxLength } from 'class-validator';

export class EnviarMensagemDto {
  @IsString()
  @Length(8, 20)
  phone!: string;

  @IsString()
  @MaxLength(1000)
  message!: string;
}
