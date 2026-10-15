import { ValidationPipe } from '@nestjs/common';
import { normalizeModules, toggleModule } from '@nexly/shared';
import { AutomacaoDto, ConsentimentoDto, RecorrenciaDto, TarefaDto } from './operacoes.dto';
import { datasRecorrentes, proximaExecucao, telefoneWhatsApp } from './operacoes.service';

describe('modulos operacionais', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const validate = (
    value: unknown,
    metatype:
      typeof ConsentimentoDto | typeof RecorrenciaDto | typeof AutomacaoDto | typeof TarefaDto,
  ) => pipe.transform(value, { type: 'body', metatype });
  const uuid = 'b64c48ce-9cfa-4135-821c-7baf199c1db7';
  it('inclui e remove dependencias de recorrencias e automacao', () => {
    expect(normalizeModules(['recorrencias'])).toEqual(
      expect.arrayContaining(['agenda', 'clientes', 'servicos', 'profissionais']),
    );
    expect(normalizeModules(['automacao'])).toContain('tarefas');
    expect(toggleModule(normalizeModules(['automacao']), 'tarefas')).not.toContain('automacao');
  });
  it('gera datas atravessando meses sem mutar o inicio', () => {
    const inicio = new Date('2026-12-28T13:00:00Z');
    expect(datasRecorrentes(inicio, 7, 3).map((d) => d.toISOString())).toEqual([
      '2026-12-28T13:00:00.000Z',
      '2027-01-04T13:00:00.000Z',
      '2027-01-11T13:00:00.000Z',
    ]);
    expect(inicio.toISOString()).toBe('2026-12-28T13:00:00.000Z');
  });
  it('avanca execucoes atrasadas sem criar uma avalanche de tarefas', () => {
    expect(
      proximaExecucao(
        new Date('2026-10-01T13:00:00Z'),
        7,
        new Date('2026-10-30T13:00:00Z'),
      ).toISOString(),
    ).toBe('2026-11-05T13:00:00.000Z');
  });
  it('avanca tambem quando o horario coincide exatamente com o ciclo', () => {
    expect(
      proximaExecucao(
        new Date('2026-10-01T13:00:00Z'),
        1,
        new Date('2026-10-02T13:00:00Z'),
      ).toISOString(),
    ).toBe('2026-10-03T13:00:00.000Z');
  });
  it.each([
    ['(11) 99999-9999', '5511999999999'],
    ['5511999999999', '5511999999999'],
    ['1133334444', '551133334444'],
    [null, null],
    ['123', null],
    ['https://evil.test', null],
  ])('normaliza telefone %s sem aceitar URLs', (input, expected) => {
    expect(telefoneWhatsApp(input)).toBe(expected);
  });
  it('exige consentimento booleano real e evidencia', async () => {
    await expect(
      validate(
        { clienteId: uuid, autorizado: 'true', evidencia: 'Cliente autorizou presencialmente' },
        ConsentimentoDto,
      ),
    ).rejects.toThrow();
    await expect(
      validate({ clienteId: uuid, autorizado: true, evidencia: 'ok' }, ConsentimentoDto),
    ).rejects.toThrow();
    await expect(
      validate(
        { clienteId: uuid, autorizado: false, evidencia: 'Revogacao recebida hoje' },
        ConsentimentoDto,
      ),
    ).resolves.toMatchObject({ autorizado: false });
  });
  it('nao permite sobrescrever a empresa do registro pelo payload', async () => {
    await expect(
      validate(
        {
          clienteId: uuid,
          autorizado: true,
          evidencia: 'Cliente autorizou presencialmente',
          empresaId: uuid,
        },
        ConsentimentoDto,
      ),
    ).rejects.toThrow();
  });
  const serie = {
    titulo: 'Consultas semanais',
    clienteId: uuid,
    profissionalId: uuid,
    servicoId: uuid,
    inicio: '2026-12-01T13:00:00Z',
    intervaloDias: 7,
    quantidade: 4,
  };
  it.each([
    { quantidade: 25 },
    { quantidade: 1 },
    { intervaloDias: 0 },
    { intervaloDias: 91 },
    { inicio: '2026-12-01' },
    { clienteId: 'outra-empresa' },
  ])('rejeita serie invalida %j', async (override) => {
    await expect(validate({ ...serie, ...override }, RecorrenciaDto)).rejects.toThrow();
  });
  it('aceita serie limitada com timezone explicito', async () => {
    await expect(validate(serie, RecorrenciaDto)).resolves.toMatchObject({ quantidade: 4 });
  });
  it('rejeita automacao com intervalo invalido ou booleano textual', async () => {
    const automacao = {
      titulo: 'Conferir estoque',
      descricao: '',
      intervaloDias: 1,
      proximaExecucao: '2026-12-01T13:00:00Z',
      ativa: true,
    };
    await expect(validate({ ...automacao, intervaloDias: 0 }, AutomacaoDto)).rejects.toThrow();
    await expect(validate({ ...automacao, ativa: 'false' }, AutomacaoDto)).rejects.toThrow();
  });
  it('limita status e prioridade das tarefas', async () => {
    await expect(
      validate(
        { titulo: 'Tarefa teste', descricao: '', status: 'APROVADA', prioridade: 'NORMAL' },
        TarefaDto,
      ),
    ).rejects.toThrow();
  });
});
