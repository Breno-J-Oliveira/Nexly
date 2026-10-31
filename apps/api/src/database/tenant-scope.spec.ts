import { applyTenantScope } from './tenant-scope';
import { Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Global Stripe event IDs deduplicate provider deliveries before tenant resolution.
const GLOBAL_MODELS = ['EventoStripe'];
const CHILD_MODELS: Record<string, string> = {
  BaixaFinanceira: 'lancamento',
  RecuperacaoSenha: 'usuario',
  InsumoServico: 'servico',
  ItemVenda: 'venda',
  ItemPedidoCompra: 'pedido',
  RefreshToken: 'usuario',
  AuthSession: 'usuario',
  TermoAceite: 'usuario',
};
const models = Prisma.dmmf.datamodel.models;

describe('Contrato do inventário multitenant', () => {
  it('mantém o client gerado alinhado aos modelos do schema atual', () => {
    const schema = readFileSync(resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');
    const names = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]);
    expect(models.map((model) => model.name).sort()).toEqual(names.sort());
  });

  it.each(models)('classifica e aplica isolamento ao modelo $name', (model) => {
    const direct = model.fields.some((field) => field.name === 'empresaId');
    const parent = CHILD_MODELS[model.name];
    const global = GLOBAL_MODELS.includes(model.name);
    const root = model.name === 'Empresa';
    expect([direct, Boolean(parent), global, root].filter(Boolean)).toHaveLength(1);
    const args: { where: Record<string, unknown>; data: Record<string, unknown> } = {
      where: { id: 'external' },
      data: { nome: 'fixture' },
    };
    applyTenantScope(model.name, 'findMany', args, 'verified-tenant');
    if (direct) {
      // Discovering empresaId alone is insufficient: the runtime inventory must enforce it.
      expect(args.where).toEqual({ id: 'external', empresaId: 'verified-tenant' });
      const create = { data: { empresaId: 'external' } };
      applyTenantScope(model.name, 'create', create, 'verified-tenant');
      expect(create.data.empresaId).toBe('verified-tenant');
    } else if (parent) {
      const relation = model.fields.find((field) => field.name === parent);
      expect(relation).toMatchObject({ kind: 'object', isList: false });
      const target = models.find((candidate) => candidate.name === relation?.type);
      expect(target?.fields.some((field) => field.name === 'empresaId')).toBe(true);
      expect(args.where).toEqual({
        id: 'external',
        AND: [{ [parent]: { empresaId: 'verified-tenant' } }],
      });
    } else if (root) {
      expect(args.where).toEqual({ id: 'verified-tenant' });
    } else {
      expect(args).toEqual({ where: { id: 'external' }, data: { nome: 'fixture' } });
    }
  });

  it('rejeita entradas globais ou filhas obsoletas no contrato', () => {
    const names = models.map((model) => model.name);
    for (const name of [...GLOBAL_MODELS, ...Object.keys(CHILD_MODELS)]) {
      expect(names).toContain(name);
    }
  });
});

describe('Escopo de empresa', () => {
  it.each([
    'Assinatura',
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
