import { IsInt, IsString, Min } from 'class-validator';

export class AssociarInsumoDto {
  @IsString()
  produtoId!: string;

  @IsInt()
  @Min(1)
  quantidade!: number;
}
