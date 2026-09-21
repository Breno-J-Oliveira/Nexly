import { IsString, Length } from 'class-validator';

export class ValidarCupomDto {
  @IsString()
  @Length(1, 60)
  codigo!: string;
}
