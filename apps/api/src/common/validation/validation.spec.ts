import { CriarClienteDto } from '../../clientes/dto/criar-cliente.dto';
import { AtualizarClienteDto } from '../../clientes/dto/atualizar-cliente.dto';
import { CriarUsuarioDto } from '../../usuarios/dto/criar-usuario.dto';
import { ValidationPipe } from '@nestjs/common';
import { AtualizarUsuarioDto } from '../../usuarios/dto/atualizar-usuario.dto';
import { AtualizarConfiguracoesDto } from '../../configuracoes/dto/atualizar-configuracoes.dto';
import { calendarRange } from './calendar-range';
import { dateRange } from './date-range';
describe('Entradas de revisao', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });
  it.each(['false', 'true', 1, 0])(
    'nao interpreta %s como booleano administrativo',
    async (value) => {
      await expect(
        pipe.transform({ ativo: value }, { type: 'body', metatype: AtualizarUsuarioDto }),
      ).rejects.toThrow();
    },
  );
  it('preserva false booleano real', async () => {
    await expect(
      pipe.transform({ ativo: false }, { type: 'body', metatype: AtualizarUsuarioDto }),
    ).resolves.toMatchObject({ ativo: false });
  });
  it('nao ativa lembretes com string false', async () => {
    await expect(
      pipe.transform(
        { lembretesAtivos: 'false' },
        { type: 'body', metatype: AtualizarConfiguracoesDto },
      ),
    ).rejects.toThrow();
  });
  it.each([
    ['2026-02-30', '2026-03-01'],
    ['2026-10-14', '2026-10-13'],
    ['', '2026-10-14'],
    ['2026-10-14T00:00Z', '2026-10-15'],
  ])('rejeita periodo %s a %s', (a, b) => expect(() => dateRange(a, b)).toThrow());
  it('inclui dia final inteiro em UTC', () => {
    expect(dateRange('2026-10-01', '2026-10-14').fim.toISOString()).toBe(
      '2026-10-14T23:59:59.999Z',
    );
  });
  it.each([
    { inicio: '2026-10-15T00:00:00', fim: '2026-10-16T00:00:00' },
    { inicio: '2026-02-30T03:00:00Z', fim: '2026-03-01T03:00:00Z' },
    { inicio: '2026-10-15T03:00:00Z' },
    { dataFim: '2026-10-15' },
    { data: '2026-10-15', inicio: '2026-10-15T03:00:00Z', fim: '2026-10-16T03:00:00Z' },
  ])('recusa limites ambíguos ou inválidos %p', (filters) => {
    expect(() => calendarRange(filters)).toThrow();
  });
  it.each([CriarClienteDto, AtualizarClienteDto])(
    'contatos vazios são opcionais e podem ser apagados em %p',
    async (metatype) => {
      await expect(
        pipe.transform(
          { nome: ' Cliente teste ', telefone: '', email: ' ' },
          { type: 'body', metatype },
        ),
      ).resolves.toMatchObject({ nome: 'Cliente teste', telefone: null, email: null });
    },
  );
  it('e-mail de novo usuário segue a mesma normalização do login', async () => {
    await expect(
      pipe.transform(
        { nome: ' Nome ', email: ' Pessoa@Example.Test ', senha: 'TesteSeguro123!' },
        { type: 'body', metatype: CriarUsuarioDto },
      ),
    ).resolves.toMatchObject({ nome: 'Nome', email: 'pessoa@example.test' });
  });
  it('não cadastra nome composto apenas de espaços', async () => {
    await expect(
      pipe.transform({ nome: '   ' }, { type: 'body', metatype: CriarClienteDto }),
    ).rejects.toThrow();
  });
});
