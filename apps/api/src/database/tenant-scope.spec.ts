import { applyTenantScope } from './tenant-scope';

describe('Escopo de empresa', () => {
  it.each([
    'Tarefa',
    'Filial',
    'Documento',
    'Campanha',
    'ConsentimentoMarketing',
    'Automacao',
    'Recorrencia',
  ])('escopa o novo modelo %s', (model) => {
    const args = { where: { id: 'externo', empresaId: 'e2' }, data: { empresaId: 'e2' } };
    applyTenantScope(model, 'updateMany', args, 'e1');
    expect(args.where.empresaId).toBe('e1');
    expect(args.data.empresaId).toBe('e1');
  });
  it.each([
    'findUnique',
    'findFirst',
    'findMany',
    'update',
    'delete',
    'updateMany',
    'deleteMany',
    'count',
  ])('%s não aceita empresa externa no where', (operation) => {
    const args = { where: { id: 'external', empresaId: 'e2', OR: [{ empresaId: 'e2' }] } };
    applyTenantScope('Cliente', operation, args, 'e1');
    expect(args.where.empresaId).toBe('e1');
    expect(args.where.id).toBe('external');
  });

  it('createMany preserva o array e escopa todos os registros', () => {
    const args = {
      data: [
        { nome: 'A', empresaId: 'e2' },
        { nome: 'B', empresaId: 'e3' },
      ],
    };
    applyTenantScope('Produto', 'createMany', args, 'e1');
    expect(args.data).toEqual([
      { nome: 'A', empresaId: 'e1' },
      { nome: 'B', empresaId: 'e1' },
    ]);
  });

  it.each([
    ['ItemPedidoCompra', 'pedido'],
    ['ItemVenda', 'venda'],
    ['InsumoServico', 'servico'],
  ])('filtra %s pelo pai sem inventar coluna empresaId', (model, parent) => {
    const args: { where?: Record<string, unknown> } = {};
    applyTenantScope(model, 'deleteMany', args, 'e1');
    expect(args.where).toEqual({ AND: [{ [parent]: { empresaId: 'e1' } }] });
  });

  it('preserva período do pai e combina AND existente', () => {
    const where = {
      venda: { createdAt: { gte: new Date('2026-10-01') } },
      AND: { quantidade: { gte: 2 } },
    };
    const args: { where: Record<string, unknown> } = { where };
    applyTenantScope('ItemVenda', 'findMany', args, 'e1');
    expect(args.where.venda).toEqual(where.venda);
    expect(args.where.AND).toEqual([{ quantidade: { gte: 2 } }, { venda: { empresaId: 'e1' } }]);
  });

  it('impede mover o registro para outra empresa em update', () => {
    const args = { where: { id: 'p1' }, data: { empresaId: 'e2', nome: 'Changed' } };
    applyTenantScope('Produto', 'update', args, 'e1');
    expect(args.data.empresaId).toBe('e1');
  });

  it('limita configurações da empresa ao id atual', () => {
    const args = { where: { id: 'e2' } };
    applyTenantScope('Empresa', 'findUnique', args, 'e1');
    expect(args.where).toEqual({ id: 'e1' });
  });
});
