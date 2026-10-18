import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TrimText } from '../common/validation/trim-text';
import { StrictBoolean } from '../common/validation/strict-boolean';

export class LancamentoDto {
  @TrimText() @IsString() @Length(2, 160) descricao!: string;
  @IsIn(['RECEITA', 'DESPESA']) tipo!: string;
  @TrimText() @IsString() @Length(2, 60) categoria!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(99999999.99) valor!: number;
  @IsDateString({ strict: true }) vencimento!: string;
  @IsOptional() @IsUUID() filialId?: string;
}
export class BaixaDto {
  @IsUUID() chave!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(99999999.99) valor!: number;
}
export class EstornoDto {
  @TrimText() @IsString() @Length(10, 500) motivo!: string;
}
export class TransferenciaDto extends EstornoDto {
  @IsUUID() chave!: string;
  @IsUUID() produtoId!: string;
  @IsOptional() @IsUUID() origemId?: string;
  @IsOptional() @IsUUID() destinoId?: string;
  @IsInt() @Min(1) @Max(1000000) quantidade!: number;
}
export class LinhaImportacaoDto {
  @TrimText() @IsString() @Length(2, 120) nome!: string;
  @IsOptional() @IsString() @Length(0, 254) email?: string;
  @IsOptional() @IsString() @Length(0, 30) telefone?: string;
  @IsOptional() @IsString() @Length(0, 60) sku?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(99999999.99) preco?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000) estoqueAtual?: number;
}
export class ImportacaoDto {
  @IsUUID() chave!: string;
  @IsIn(['clientes', 'produtos']) tipo!: 'clientes' | 'produtos';
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LinhaImportacaoDto)
  linhas!: LinhaImportacaoDto[];
}
export class PreferenciasDto {
  @TrimText() @IsString() @Length(2, 30) nomeCliente!: string;
  @TrimText() @IsString() @Length(2, 30) nomeServico!: string;
  @IsIn(['veterinaria', 'psicologia', 'salao', 'petshop', 'estetica', 'personalizado'])
  segmento!: string;
  @IsBoolean() @StrictBoolean() mostrarGuia!: boolean;
}
export class ComprovacaoDto {
  @IsIn(['BACKUP', 'RESTAURACAO', 'HOMOLOGACAO']) tipo!: string;
  @TrimText() @IsString() @Length(5, 500) referencia!: string;
  @IsDateString({ strict: true }) verificadoEm!: string;
  @TrimText() @IsString() @Length(10, 2000) observacoes!: string;
}
export class ReprocessarJobDto {
  @IsUUID() id!: string;
}
