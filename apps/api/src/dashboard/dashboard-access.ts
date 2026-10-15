import { Role } from '@nexly/shared';
import { hasPermission } from '../common/auth/permissions';
/** Allowlist aplicada depois do cache compartilhado; dados nao autorizados nunca saem da API. */
export function filtrarDashboard(data: Record<string, unknown>, role: Role) {
  const permissoes = {
    financeiro: hasPermission(role, 'financeiro:read'),
    agenda: hasPermission(role, 'agenda:read'),
    estoque: hasPermission(role, 'estoque:read'),
  };
  const result: Record<string, unknown> = { permissoes };
  const grupos = {
    financeiro: [
      'receitaMes',
      'ticketMedio',
      'faturamentoHoje',
      'evolucaoVendasSemanal',
      'topProdutos',
    ],
    agenda: [
      'agendamentosHoje',
      'taxaOcupacao',
      'agendamentosPorDia',
      'topServicos',
      'proximosCompromissos',
    ],
    estoque: ['alertasEstoque'],
  };
  for (const grupo of Object.keys(grupos) as (keyof typeof grupos)[])
    if (permissoes[grupo])
      for (const key of grupos[grupo]) if (key in data) result[key] = data[key];
  return result;
}
