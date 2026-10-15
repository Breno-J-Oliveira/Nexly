import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';
import { TrimText } from '../../common/validation/trim-text';

export class ListarProdutosDto extends PaginacaoDto {
  @IsOptional()
  @TrimText()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @TrimText()
  @IsString()
  @MaxLength(60)
  categoria?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estoqueAbaixoDe?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  vencendoEm?: number;
}
