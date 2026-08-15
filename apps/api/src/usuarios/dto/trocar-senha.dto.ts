import { IsString, Length } from 'class-validator';

export class TrocarSenhaDto {
  @IsString()
  senhaAtual!: string;

  @IsString()
  @Length(8, 72)
  novaSenha!: string;
}
