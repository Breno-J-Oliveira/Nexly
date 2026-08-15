import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class ItemVendaDto {
  @IsString()
  produtoId!: string;

  @IsInt()
  @Min(1)
  quantidade!: number;
}

export class CriarVendaDto {
  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemVendaDto)
  itens!: ItemVendaDto[];
}
