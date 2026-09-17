import { IsDateString, IsString, Length, MaxLength } from 'class-validator';

export class EnviarLembreteDto {
  @IsString()
  @Length(8, 20)
  phone!: string;

  @IsString()
  @MaxLength(120)
  clientName!: string;

  @IsString()
  @MaxLength(120)
  professionalName!: string;

  @IsString()
  @MaxLength(120)
  serviceName!: string;

  @IsDateString()
  dateTime!: string;
}
