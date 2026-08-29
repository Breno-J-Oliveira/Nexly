-- =============================================================
-- Nexly — Row-Level Security (RLS)
-- Isolamento de dados por tenant no nível do banco de dados.
-- Aplicado após a migration inicial do Prisma.
-- O tenant atual é definido por sessão via:
--   SELECT set_config('app.current_tenant', '<empresa_id>', true);
-- =============================================================

-- Helper: converte o setting para text, retornando NULL se vazio/ausente.
-- Como empresa_id é String no Prisma (não uuid), comparamos em text.
-- Isso evita o erro "text = uuid" e cobre o caso do setting não estar definido.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_tenant', true), '');
$$ LANGUAGE sql STABLE;

-- Tabelas com empresa_id direto ---------------------------------

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clientes
  USING (empresa_id = app_current_tenant())
  WITH CHECK (empresa_id = app_current_tenant());

ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON profissionais
  USING (empresa_id = app_current_tenant())
  WITH CHECK (empresa_id = app_current_tenant());

ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON servicos
  USING (empresa_id = app_current_tenant())
  WITH CHECK (empresa_id = app_current_tenant());

ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agendamentos
  USING (empresa_id = app_current_tenant())
  WITH CHECK (empresa_id = app_current_tenant());

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON produtos
  USING (empresa_id = app_current_tenant())
  WITH CHECK (empresa_id = app_current_tenant());

ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON movimentacoes_estoque
  USING (empresa_id = app_current_tenant())
  WITH CHECK (empresa_id = app_current_tenant());

ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON vendas
  USING (empresa_id = app_current_tenant())
  WITH CHECK (empresa_id = app_current_tenant());

-- Tabelas filhas (sem empresa_id — via subquery no pai) ---------

ALTER TABLE insumos_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON insumos_servico
  USING (EXISTS (
    SELECT 1 FROM servicos s
    WHERE s.id = insumos_servico.servico_id
      AND s.empresa_id = app_current_tenant()
  ));

ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON itens_venda
  USING (EXISTS (
    SELECT 1 FROM vendas v
    WHERE v.id = itens_venda.venda_id
      AND v.empresa_id = app_current_tenant()
  ));

-- Tabelas excluídas do RLS (acesso via guards da aplicação):
--   empresas, usuarios, refresh_tokens
