import { IsInt, IsString, Min } from 'class-validator';

export class RegistrarEntradaDto {
  @IsString()
  produtoId!: string;

  @IsInt()
  @Min(1)
  quantidade!: number;

  @IsString()
  motivo!: string;
}
