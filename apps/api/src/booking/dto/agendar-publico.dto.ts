import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  IsUUID,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AgendarPublicoDto {
  @IsUUID()
  servicoId!: string;

  /** Opcional: quando ausente, o sistema escolhe um profissional livre. */
  @IsOptional()
  @IsUUID()
  profissionalId?: string;

  @IsDateString({ strict: true, strictSeparator: true })
  @MaxLength(40)
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/)
  dataHora!: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 120)
  clienteNome!: string;

  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @Matches(/^\d{10,13}$/)
  clienteTelefone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  clienteEmail?: string;
}
