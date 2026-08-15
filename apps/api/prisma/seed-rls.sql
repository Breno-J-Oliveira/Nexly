-- =============================================================
-- Nexly — Row-Level Security (RLS)
-- Isolamento de dados por tenant no nível do banco de dados.
-- Aplicado após a migration inicial do Prisma.
-- O tenant atual é definido por sessão via:
--   SELECT set_config('app.current_tenant', '<empresa_id>', true);
-- =============================================================

-- Tabelas com empresa_id direto ---------------------------------

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clientes
  USING (empresa_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (empresa_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON profissionais
  USING (empresa_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (empresa_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON servicos
  USING (empresa_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (empresa_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agendamentos
  USING (empresa_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (empresa_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON produtos
  USING (empresa_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (empresa_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON movimentacoes_estoque
  USING (empresa_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (empresa_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON vendas
  USING (empresa_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (empresa_id = current_setting('app.current_tenant', true)::uuid);

-- Tabelas filhas (sem empresa_id — via subquery no pai) ---------

ALTER TABLE insumos_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON insumos_servico
  USING (EXISTS (
    SELECT 1 FROM servicos s
    WHERE s.id = insumos_servico.servico_id
      AND s.empresa_id = current_setting('app.current_tenant', true)::uuid
  ));

ALTER TABLE itens_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON itens_venda
  USING (EXISTS (
    SELECT 1 FROM vendas v
    WHERE v.id = itens_venda.venda_id
      AND v.empresa_id = current_setting('app.current_tenant', true)::uuid
  ));

-- Tabelas excluídas do RLS (acesso via guards da aplicação):
--   empresas, usuarios, refresh_tokens
