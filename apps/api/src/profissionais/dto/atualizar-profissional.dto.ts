import { TrimText } from '../../common/validation/trim-text';
import { IsOptional, IsString, Length } from 'class-validator';

export class AtualizarProfissionalDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @TrimText()
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  @TrimText({ nullable: true })
  especialidade?: string | null;
}
