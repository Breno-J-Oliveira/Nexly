import { CriarClienteDto } from '../../clientes/dto/criar-cliente.dto';
import { AtualizarClienteDto } from '../../clientes/dto/atualizar-cliente.dto';
import { CriarUsuarioDto } from '../../usuarios/dto/criar-usuario.dto';
import { ValidationPipe } from '@nestjs/common';
import { AtualizarUsuarioDto } from '../../usuarios/dto/atualizar-usuario.dto';
import { AtualizarConfiguracoesDto } from '../../configuracoes/dto/atualizar-configuracoes.dto';
import { calendarRange } from './calendar-range';
import { dateRange } from './date-range';
import { AtualizarProdutoDto } from '../../produtos/dto/atualizar-produto.dto';
import { AtualizarServicoDto } from '../../servicos/dto/atualizar-servico.dto';
import { CriarServicoDto } from '../../servicos/dto/criar-servico.dto';
import { AtualizarProfissionalDto } from '../../profissionais/dto/atualizar-profissional.dto';
import { CriarAgendamentoDto } from '../../agendamentos/dto/criar-agendamento.dto';
import { AtualizarLembretesDto } from '../../configuracoes/dto/atualizar-lembretes.dto';
import { AtualizarFornecedorDto } from '../../fornecedores/dto/atualizar-fornecedor.dto';
import { CriarFornecedorDto } from '../../fornecedores/dto/criar-fornecedor.dto';
import { AtualizarCupomDto } from '../../cupons/dto/atualizar-cupom.dto';
import { CriarCupomDto } from '../../cupons/dto/criar-cupom.dto';
import { FilialDto } from '../../operacoes/operacoes.dto';
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

  it.each([
    [AtualizarProdutoDto, { nome: null }],
    [AtualizarProdutoDto, { preco: null }],
    [AtualizarProdutoDto, { estoqueMinimo: null }],
    [AtualizarServicoDto, { nome: null }],
    [AtualizarServicoDto, { duracaoMin: null }],
    [AtualizarServicoDto, { preco: null }],
    [AtualizarClienteDto, { nome: null }],
    [AtualizarProfissionalDto, { nome: null }],
    [AtualizarUsuarioDto, { nome: null }],
    [AtualizarUsuarioDto, { role: null }],
    [AtualizarUsuarioDto, { ativo: null }],
    [AtualizarConfiguracoesDto, { nome: null }],
    [AtualizarConfiguracoesDto, { cnpj: null }],
    [AtualizarConfiguracoesDto, { fusoHorario: null }],
    [AtualizarConfiguracoesDto, { lembretesAtivos: null }],
    [AtualizarLembretesDto, { lembretesAtivos: null }],
    [AtualizarFornecedorDto, { nome: null }],
    [AtualizarFornecedorDto, { ativo: null }],
    [AtualizarCupomDto, { codigo: null }],
    [AtualizarCupomDto, { tipo: null }],
    [AtualizarCupomDto, { valor: null }],
    [AtualizarCupomDto, { ativo: null }],
  ])('recusa null em campo obrigatório de %p', async (metatype, value) => {
    await expect(pipe.transform(value, { type: 'body', metatype })).rejects.toThrow();
  });

  it.each([AtualizarProdutoDto, AtualizarServicoDto, AtualizarUsuarioDto])(
    'permite omitir campos em atualizações parciais de %p',
    async (metatype) => {
      await expect(pipe.transform({}, { type: 'body', metatype })).resolves.toBeDefined();
    },
  );

  it.each([CriarServicoDto, AtualizarServicoDto])(
    'normaliza nome de serviço e rejeita espaços ou preço fora do banco em %p',
    async (metatype) => {
      const value = { nome: '  Consulta  ', preco: 10, duracaoMin: 30 };
      await expect(pipe.transform(value, { type: 'body', metatype })).resolves.toMatchObject({
        nome: 'Consulta',
      });
      await expect(
        pipe.transform({ ...value, nome: '   ' }, { type: 'body', metatype }),
      ).rejects.toThrow();
      await expect(
        pipe.transform({ ...value, preco: 100000000 }, { type: 'body', metatype }),
      ).rejects.toThrow();
    },
  );

  const appointment = {
    clienteId: 'b64c48ce-9cfa-4135-821c-7baf199c1db7',
    profissionalId: 'b64c48ce-9cfa-4135-821c-7baf199c1db8',
    servicoId: 'b64c48ce-9cfa-4135-821c-7baf199c1db9',
  };
  it.each([
    [CriarFornecedorDto, { nome: '   ' }],
    [AtualizarFornecedorDto, { nome: '   ' }],
    [FilialDto, { nome: '   ', endereco: 'Rua teste, 123', ativa: true }],
    [CriarCupomDto, { codigo: '   ', tipo: 'FIXO', valor: 10 }],
    [AtualizarCupomDto, { codigo: '   ' }],
    [CriarCupomDto, { codigo: 'TESTE', tipo: 'FIXO', valor: 100000000 }],
    [AtualizarCupomDto, { valor: 100000000 }],
    [CriarCupomDto, { codigo: 'TESTE', tipo: 'FIXO', valor: 10, validade: '2030-02-30' }],
  ])('rejeita entrada vazia ou fora dos limites em %p', async (metatype, value) => {
    await expect(pipe.transform(value, { type: 'body', metatype })).rejects.toThrow();
  });
  it.each(['2030-02-30T13:00:00Z', '2030-03-05T13:00:00', '2030-03-05'])(
    'rejeita data impossível ou ambígua na agenda: %s',
    async (dataHora) => {
      await expect(
        pipe.transform(
          { ...appointment, dataHora },
          { type: 'body', metatype: CriarAgendamentoDto },
        ),
      ).rejects.toThrow();
    },
  );
  it.each(['2030-03-05T13:00:00Z', '2030-03-05T10:00:00-03:00'])(
    'aceita horário explícito na agenda: %s',
    async (dataHora) => {
      await expect(
        pipe.transform(
          { ...appointment, dataHora },
          { type: 'body', metatype: CriarAgendamentoDto },
        ),
      ).resolves.toMatchObject({ dataHora });
    },
  );
});
