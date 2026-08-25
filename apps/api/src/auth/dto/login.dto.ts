import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254) // RFC 5321 — limite prático de tamanho de e-mail
  email!: string;

  /**
   * Limite razoável: Argon2id processa o input antes do hash, então
   * uma senha gigante causa CPU-bound antes mesmo do bcrypt-style
   * cost. Limitar a 128 chars evita que um atacante DoS o backend
   * enviando senhas enormes.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  senha!: string;
}
