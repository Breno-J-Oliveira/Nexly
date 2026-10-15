import { Transform } from 'class-transformer';
import { TELEFONE_WHATSAPP } from '../whatsapp-phone';
import { IsDateString, IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class EnviarLembreteDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @Matches(TELEFONE_WHATSAPP, { message: 'Informe um telefone com DDD válido' })
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  clientName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  professionalName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  serviceName!: string;

  @IsDateString()
  dateTime!: string;
}
