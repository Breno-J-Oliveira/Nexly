import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class ListarVendasDto extends PaginacaoDto {
  @IsOptional() @IsString() @MaxLength(40) dataInicio?: string;
  @IsOptional() @IsString() @MaxLength(40) dataFim?: string;
  @IsOptional() @IsUUID() clienteId?: string;
}
