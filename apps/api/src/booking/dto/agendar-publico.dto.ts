import { IsDateString, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class AgendarPublicoDto {
  @IsString()
  servicoId!: string;

  /** Opcional: quando ausente, o sistema escolhe um profissional livre. */
  @IsOptional()
  @IsString()
  profissionalId?: string;

  @IsDateString()
  dataHora!: string;

  @IsString()
  @Length(2, 120)
  clienteNome!: string;

  @IsString()
  @Length(8, 20)
  clienteTelefone!: string;

  @IsOptional()
  @IsEmail()
  clienteEmail?: string;
}
