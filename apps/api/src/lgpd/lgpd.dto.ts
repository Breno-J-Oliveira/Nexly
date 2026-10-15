import { Equals, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmarSenhaLgpdDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class ExcluirContaDto extends ConfirmarSenhaLgpdDto {
  @IsString()
  @Equals('EXCLUIR MINHA CONTA')
  confirmacao!: string;
}
