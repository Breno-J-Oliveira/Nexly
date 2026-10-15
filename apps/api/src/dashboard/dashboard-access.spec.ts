import { Role } from '@nexly/shared';
import { filtrarDashboard } from './dashboard-access';
const data = {
  receitaMes: { atual: 9999 },
  ticketMedio: 99,
  faturamentoHoje: 999,
  evolucaoVendasSemanal: [{ total: 999 }],
  topProdutos: [{ nome: 'Segredo' }],
  agendamentosHoje: { total: 10 },
  taxaOcupacao: 50,
  topServicos: [],
  agendamentosPorDia: [],
  proximosCompromissos: [{ cliente: 'Cliente privado' }],
  alertasEstoque: [{ nome: 'Produto' }],
  novoCampoPrivado: 'nao pode vazar',
};
describe('Dashboard por permissao', () => {
  it.each([Role.ADMIN, Role.GESTOR])('%s recebe indicadores financeiros', (role) => {
    expect(filtrarDashboard(data, role).receitaMes).toEqual(data.receitaMes);
  });
  it.each([Role.PROFISSIONAL, Role.RECEPCIONISTA, Role.CAIXA])(
    '%s nao recebe receita de cache compartilhado',
    (role) => {
      const result = filtrarDashboard(data, role);
      for (const key of [
        'receitaMes',
        'ticketMedio',
        'faturamentoHoje',
        'evolucaoVendasSemanal',
        'topProdutos',
      ])
        expect(result).not.toHaveProperty(key);
    },
  );
  it('caixa recebe estoque, sem compromissos de clientes', () => {
    const result = filtrarDashboard(data, Role.CAIXA);
    expect(result.alertasEstoque).toEqual(data.alertasEstoque);
    expect(result).not.toHaveProperty('proximosCompromissos');
  });
  it('profissional recebe agenda sem dados de estoque', () => {
    const result = filtrarDashboard(data, Role.PROFISSIONAL);
    expect(result.agendamentosHoje).toEqual(data.agendamentosHoje);
    expect(result).not.toHaveProperty('alertasEstoque');
  });
  it('allowlist impede campos futuros vazarem e nao modifica cache', () => {
    expect(filtrarDashboard(data, Role.ADMIN)).not.toHaveProperty('novoCampoPrivado');
    filtrarDashboard(data, Role.CAIXA);
    expect(data.receitaMes.atual).toBe(9999);
  });
});
