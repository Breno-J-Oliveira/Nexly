-- O Nexly usa Prisma no servidor, sem acesso dos clientes à Data API dessas tabelas.
-- RLS permanece ativa; remove também as concessões herdadas do Supabase.
DO $migration$
DECLARE target_table text; client_role text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'lancamentos_financeiros','saldos_filiais','jobs_duraveis','importacoes',
    'comprovacoes_operacionais','transferencias_filiais','baixas_financeiras','recuperacoes_senha'
  ] LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', target_table);
    FOREACH client_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=client_role) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', target_table, client_role);
      END IF;
    END LOOP;
  END LOOP;

  -- Restringe apenas public e o criador das migrações; não muda auth/storage/service_role.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;
  FOREACH client_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=client_role) THEN
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I', client_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I', client_role);
    END IF;
  END LOOP;
END $migration$;
