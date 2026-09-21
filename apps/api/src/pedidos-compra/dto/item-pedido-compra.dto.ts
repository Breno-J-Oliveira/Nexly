import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ItemPedidoCompraDto {
  @IsString()
  produtoId!: string;

  @IsInt()
  @Min(1)
  quantidade!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precoEsperado?: number;
}
