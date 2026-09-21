import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ItemPedidoCompraDto } from './item-pedido-compra.dto';

export class AtualizarPedidoCompraDto {
  @IsOptional()
  @IsString()
  fornecedorId?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoCompraDto)
  itens?: ItemPedidoCompraDto[];
}
