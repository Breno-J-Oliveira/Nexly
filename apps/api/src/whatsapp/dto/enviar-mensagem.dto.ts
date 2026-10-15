import { Transform } from 'class-transformer';
import { TELEFONE_WHATSAPP } from '../whatsapp-phone';
import { IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class EnviarMensagemDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @Matches(TELEFONE_WHATSAPP, { message: 'Informe um telefone com DDD válido' })
  phone!: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}
