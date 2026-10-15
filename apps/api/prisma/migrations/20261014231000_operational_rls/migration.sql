ALTER TABLE "tarefas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tarefas"
 USING (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''))
 WITH CHECK (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''));

ALTER TABLE "filiais" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "filiais"
 USING (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''))
 WITH CHECK (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''));

ALTER TABLE "documentos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "documentos"
 USING (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''))
 WITH CHECK (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''));

ALTER TABLE "campanhas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "campanhas"
 USING (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''))
 WITH CHECK (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''));

ALTER TABLE "consentimentos_marketing" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "consentimentos_marketing"
 USING (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''))
 WITH CHECK (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''));

ALTER TABLE "automacoes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "automacoes"
 USING (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''))
 WITH CHECK (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''));

ALTER TABLE "recorrencias" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "recorrencias"
 USING (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''))
 WITH CHECK (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''));