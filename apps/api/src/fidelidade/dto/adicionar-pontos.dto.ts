import { IsInt, IsString, Max, Min } from 'class-validator';

export class AdicionarPontosDto {
  @IsString()
  clienteId!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  pontos!: number;
}
