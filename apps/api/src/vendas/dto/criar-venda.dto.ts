import { Type } from 'class-transformer';
import { StrictBoolean } from '../../common/validation/strict-boolean';
import {
  ArrayMaxSize,
  IsBoolean,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemVendaDto {
  @IsString()
  produtoId!: string;

  @IsInt()
  @Min(1)
  @Max(1000000)
  quantidade!: number;
}

export class CriarVendaDto {
  @IsOptional() @IsUUID() chaveOperacao?: string;
  @IsOptional() @IsUUID() filialId?: string;
  @IsOptional() @IsBoolean() @StrictBoolean() recebido?: boolean;
  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ItemVendaDto)
  itens!: ItemVendaDto[];

  @IsOptional()
  @IsString()
  formaPagamento?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999999)
  desconto?: number;

  @IsOptional()
  @IsString()
  cupomCodigo?: string;
}
