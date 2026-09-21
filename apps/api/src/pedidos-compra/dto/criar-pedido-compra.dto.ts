import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ItemPedidoCompraDto } from './item-pedido-compra.dto';

export class CriarPedidoCompraDto {
  @IsOptional()
  @IsString()
  fornecedorId?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoCompraDto)
  itens!: ItemPedidoCompraDto[];
}
