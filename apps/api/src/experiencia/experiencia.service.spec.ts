import { ExperienciaService, podePedirRecomendacao } from './experiencia.service';
import { normalizeModules, toggleModule } from '@nexly/shared';

describe('experiência do usuário', () => {
  const agora = new Date('2026-10-14T12:00:00Z');
  const usuario = {
    createdAt: new Date('2026-10-01T12:00:00Z'),
    diasDeUso: 3,
    naoPedirAvaliacao: false,
    lembrarAvaliacaoEm: null as Date | null,
  };
  it('convida depois de tempo e uso real, sem filtrar pela nota', () => {
    expect(podePedirRecomendacao(usuario, false, agora)).toBe(true);
    expect(podePedirRecomendacao({ ...usuario, diasDeUso: 2 }, false, agora)).toBe(false);
    expect(podePedirRecomendacao({ ...usuario, createdAt: agora }, false, agora)).toBe(false);
  });
  it('respeita envio, recusa e adiamento', () => {
    expect(podePedirRecomendacao(usuario, true, agora)).toBe(false);
    expect(podePedirRecomendacao({ ...usuario, naoPedirAvaliacao: true }, false, agora)).toBe(
      false,
    );
    expect(
      podePedirRecomendacao(
        { ...usuario, lembrarAvaliacaoEm: new Date('2026-11-01') },
        false,
        agora,
      ),
    ).toBe(false);
  });
  it('inclui dependências e remove dependentes sem ciclos', () => {
    expect(normalizeModules(['pdv'])).toEqual(
      expect.arrayContaining(['pdv', 'estoque', 'vendas', 'clientes']),
    );
    expect(toggleModule(normalizeModules(['agenda']), 'clientes')).not.toContain('agenda');
    expect(normalizeModules(['inexistente'])).toEqual([]);
  });
  it('publica somente dados autorizados, aprovados e de contas ativas', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new ExperienciaService({ client: { depoimento: { findMany } } } as never);
    await service.publicos();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'APROVADO', autorizaPublicacao: true, usuario: { ativo: true } },
      }),
    );
    expect(findMany.mock.calls[0][0].select).not.toHaveProperty('usuario');
    expect(findMany.mock.calls[0][0].select).not.toHaveProperty('empresaId');
  });
  it('impede recomendar antes do tempo mínimo no servidor', async () => {
    const service = new ExperienciaService({
      client: {
        usuario: {
          findFirstOrThrow: jest.fn().mockResolvedValue({ createdAt: new Date(), diasDeUso: 3 }),
        },
      },
    } as never);
    await expect(service.recomendar('user', 'empresa', {} as never)).rejects.toThrow('7 dias');
  });
  it('reenvia edições à moderação e nunca aceita status do cliente', async () => {
    const upsert = jest.fn();
    const service = new ExperienciaService({
      client: {
        usuario: { findFirstOrThrow: jest.fn().mockResolvedValue(usuario) },
        depoimento: { upsert },
      },
    } as never);
    await service.recomendar('user', 'empresa', {
      nota: 1,
      texto: 'Minha experiência real com o produto.',
      nomePublico: 'Pessoa',
      ocupacao: 'Profissional',
      autorizaPublicacao: true,
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ nota: 1, status: 'PENDENTE' }) }),
    );
  });
  it('conta apenas um dia por data, usando alteração condicional atômica', async () => {
    const updateMany = jest.fn();
    const service = new ExperienciaService({ client: { usuario: { updateMany } } } as never);
    jest.spyOn(service, 'perfil').mockResolvedValue({} as never);
    await service.atividade('user', 'empresa');
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'user', empresaId: 'empresa', OR: expect.any(Array) }),
        data: expect.objectContaining({ diasDeUso: { increment: 1 } }),
      }),
    );
  });
});
