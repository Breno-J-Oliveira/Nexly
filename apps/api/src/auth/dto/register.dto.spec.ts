import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('Cadastro e aceite', () => {
  const valid = {
    empresaNome: 'Empresa',
    cnpj: '11222333000181',
    responsavelNome: 'Pessoa',
    email: '  TESTE@EXAMPLE.COM  ',
    senha: 'SenhaSegura123',
    aceitouTermos: true,
  };
  const dto = (data: object) =>
    plainToInstance(RegisterDto, data, { enableImplicitConversion: true });

  it('normaliza email e permite cadastro sem dados de cartão', async () => {
    const input = dto(valid);
    expect(await validate(input)).toHaveLength(0);
    expect(input.email).toBe('teste@example.com');
  });

  it.each([false, 'false', 'true', undefined])(
    'aceite %s não é consentimento explícito',
    async (value) => {
      const errors = await validate(dto({ ...valid, aceitouTermos: value }));
      expect(errors.some((error) => error.property === 'aceitouTermos')).toBe(true);
    },
  );

  it('rejeita campos de pagamento no whitelist', async () => {
    const errors = await validate(dto({ ...valid, cvv: '123', numeroCartao: '4111111111111111' }), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['cvv', 'numeroCartao']),
    );
  });
});
