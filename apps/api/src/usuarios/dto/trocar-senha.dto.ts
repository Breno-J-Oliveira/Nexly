import { IsString, Length } from 'class-validator';

export class TrocarSenhaDto {
  @IsString()
  @Length(1, 128)
  senhaAtual!: string;

  @IsString()
  @Length(8, 72)
  novaSenha!: string;
}
