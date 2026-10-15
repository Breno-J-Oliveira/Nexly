import {
  IsString,
  Length,
  IsOptional,
  IsIn,
  IsISO8601,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class TituloDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @Length(2, 120)
  titulo!: string;
}
export class TarefaDto extends TituloDto {
  @IsString() @Length(0, 4000) descricao!: string;
  @IsIn(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA']) status!: string;
  @IsIn(['BAIXA', 'NORMAL', 'ALTA']) prioridade!: string;
  @IsOptional() @IsISO8601() @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) prazo?: string | null;
  @IsOptional() @IsUUID() responsavelId?: string | null;
  @IsOptional() @IsUUID() filialId?: string | null;
}
export class FilialDto {
  @IsString() @Length(2, 120) nome!: string;
  @IsString() @Length(5, 400) endereco!: string;
  @IsOptional() @IsString() @Length(0, 30) telefone?: string;
  @IsBoolean() @Transform(({ obj }: { obj: { ativa: unknown } }) => obj.ativa) ativa!: boolean;
}
export class DocumentoDto extends TituloDto {
  @IsString() @Length(1, 50000) conteudo!: string;
  @IsIn(['GERAL', 'MODELO', 'PROCEDIMENTO', 'TERMO']) categoria!: string;
  @IsOptional() @IsInt() @Min(1) versao?: number;
}
export class CampanhaDto extends TituloDto {
  @IsString() @Length(5, 2000) mensagem!: string;
  @IsIn(['RASCUNHO', 'ATIVA', 'ENCERRADA']) status!: string;
}
export class ConsentimentoDto {
  @IsUUID() clienteId!: string;
  @IsBoolean()
  @Transform(({ obj }: { obj: { autorizado: unknown } }) => obj.autorizado)
  autorizado!: boolean;
  @IsString() @Length(10, 500) evidencia!: string;
}
export class AutomacaoDto extends TituloDto {
  @IsString() @Length(0, 4000) descricao!: string;
  @IsInt() @Min(1) @Max(365) intervaloDias!: number;
  @IsISO8601() @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) proximaExecucao!: string;
  @IsOptional() @IsUUID() responsavelId?: string | null;
  @IsBoolean() @Transform(({ obj }: { obj: { ativa: unknown } }) => obj.ativa) ativa!: boolean;
}
export class RecorrenciaDto extends TituloDto {
  @IsUUID() clienteId!: string;
  @IsUUID() profissionalId!: string;
  @IsUUID() servicoId!: string;
  @IsISO8601() @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) inicio!: string;
  @IsInt() @Min(1) @Max(90) intervaloDias!: number;
  @IsInt() @Min(2) @Max(24) quantidade!: number;
}
