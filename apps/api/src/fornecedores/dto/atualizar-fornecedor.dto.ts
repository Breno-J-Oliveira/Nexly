import { StrictBoolean } from '../../common/validation/strict-boolean';
import { OptionalField } from '../../common/validation/optional-field';
import { TrimText } from '../../common/validation/trim-text';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class AtualizarFornecedorDto {
  @OptionalField()
  @TrimText()
  @IsString()
  @Length(2, 120)
  nome?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @OptionalField()
  @StrictBoolean()
  ativo?: boolean;
}
