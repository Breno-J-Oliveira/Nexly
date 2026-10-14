/** Escopo de queries Prisma 5: filtros adicionais são aceitos em where único. */
const DIRECT_MODELS = new Set([
  'Usuario',
  'Cliente',
  'Profissional',
  'Servico',
  'Agendamento',
  'Produto',
  'MovimentacaoEstoque',
  'Venda',
  'Notificacao',
  'Cupom',
  'Fornecedor',
  'PedidoCompra',
  'Avaliacao',
  'ConviteUsuario',
  'AuditLog',
  'ExclusaoConta',
]);

const PARENT_SCOPES: Record<string, string> = {
  InsumoServico: 'servico',
  ItemVenda: 'venda',
  ItemPedidoCompra: 'pedido',
  RefreshToken: 'usuario',
  TermoAceite: 'usuario',
};

type Data = Record<string, unknown>;
type Args = { where?: Data; data?: Data | Data[]; create?: Data; update?: Data };

export function applyTenantScope(
  model: string,
  operation: string,
  args: Args,
  tenantId: string,
): void {
  const direct = DIRECT_MODELS.has(model);
  const parent = PARENT_SCOPES[model];
  if (!direct && !parent && model !== 'Empresa') return;

  const scope = direct
    ? { empresaId: tenantId }
    : model === 'Empresa'
      ? { id: tenantId }
      : { [parent!]: { empresaId: tenantId } };

  if (operation !== 'create' && operation !== 'createMany') {
    // Mantém chaves únicas fora do AND e substitui empresaId informado pelo cliente.
    if (parent) {
      // Mantém filtros do pai, como período, cliente e status.
      const previous = args.where?.AND;
      const conditions = Array.isArray(previous) ? previous : previous ? [previous] : [];
      args.where = { ...args.where, AND: [...conditions, scope] };
    } else {
      args.where = { ...args.where, ...scope };
    }
  }
  if (!direct) return;

  const scopedData = (data: Data): Data => ({ ...data, empresaId: tenantId });
  if (operation === 'createMany') {
    args.data = Array.isArray(args.data) ? args.data.map(scopedData) : scopedData(args.data ?? {});
  } else if (operation === 'create') {
    args.data = scopedData((args.data ?? {}) as Data);
  } else if (operation === 'upsert') {
    args.create = scopedData(args.create ?? {});
    if (args.update && 'empresaId' in args.update) args.update.empresaId = tenantId;
  } else if (args.data && !Array.isArray(args.data) && 'empresaId' in args.data) {
    args.data.empresaId = tenantId;
  }
}
