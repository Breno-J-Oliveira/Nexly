-- Idempotente: tambem pode ser aplicado como hotfix antes do proximo deploy da API.
-- O backend usa Prisma no servidor; clientes nao acessam estas tabelas pela Data API.
DO $migration$
DECLARE target_table text; role_name text; predicate text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['_prisma_migrations','empresas','usuarios','depoimentos','refresh_tokens','sessoes','clientes','profissionais','servicos','insumos_servico','agendamentos','produtos','movimentacoes_estoque','vendas','itens_venda','avaliacoes','notificacoes','cupons','fornecedores','pedidos_compra','itens_pedido_compra','convites_usuario','audit_logs','termos_aceite','exclusoes_conta','filiais','tarefas','documentos','campanhas','consentimentos_marketing','automacoes','recorrencias'] LOOP
    IF to_regclass(format('public.%I', target_table)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', target_table);
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',target_table,role_name);
      END IF;
    END LOOP;
    IF target_table <> '_prisma_migrations' AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=target_table AND policyname='tenant_isolation') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=target_table AND column_name='empresa_id') THEN
        predicate := 'empresa_id = NULLIF(current_setting(''app.current_tenant'', true), '''')';
      ELSIF target_table='empresas' THEN
        predicate := 'id = NULLIF(current_setting(''app.current_tenant'', true), '''')';
      ELSIF target_table IN ('refresh_tokens','sessoes','termos_aceite') THEN
        predicate := format('EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=%I.usuario_id AND u.empresa_id=NULLIF(current_setting(''app.current_tenant'',true),''''))',target_table);
      ELSIF target_table='itens_pedido_compra' THEN
        predicate := 'EXISTS (SELECT 1 FROM public.pedidos_compra p WHERE p.id=pedido_id AND p.empresa_id=NULLIF(current_setting(''app.current_tenant'',true),''''))';
      ELSE predicate := 'false';
      END IF;
      EXECUTE format('CREATE POLICY tenant_isolation ON public.%I USING (%s) WITH CHECK (%s)',target_table,predicate,predicate);
    END IF;
  END LOOP;
  IF to_regprocedure('public.app_current_tenant()') IS NOT NULL THEN
    ALTER FUNCTION public.app_current_tenant() SET search_path = pg_catalog;
  END IF;
END $migration$;
