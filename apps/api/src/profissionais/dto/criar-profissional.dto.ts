import { IsOptional, IsString, Length } from 'class-validator';

export class CriarProfissionalDto {
  @IsString()
  @Length(2, 120)
  nome!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  especialidade?: string;
}
