CREATE TABLE "sessoes" (
  "id" TEXT NOT NULL,
  "usuario_id" TEXT NOT NULL,
  "revogado" BOOLEAN NOT NULL DEFAULT false,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "sessoes_usuario_id_revogado_idx" ON "sessoes"("usuario_id", "revogado");

-- Tokens existentes continuam renováveis após o deploy, sem aceitar JWT sem sid.
ALTER TABLE "refresh_tokens" ADD COLUMN "session_id" TEXT;
INSERT INTO "sessoes" ("id", "usuario_id", "revogado", "expires_at", "created_at")
  SELECT "id", "usuario_id", "revogado", "expires_at", "created_at" FROM "refresh_tokens";
UPDATE "refresh_tokens" SET "session_id" = "id";
ALTER TABLE "refresh_tokens" ALTER COLUMN "session_id" SET NOT NULL;
CREATE INDEX "refresh_tokens_session_id_revogado_idx" ON "refresh_tokens"("session_id", "revogado");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.sessoes FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.sessoes FROM %I',role_name);
    END IF;
  END LOOP;
END $$;
CREATE POLICY tenant_isolation ON public.sessoes
  USING (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=sessoes.usuario_id AND u.empresa_id=NULLIF(current_setting('app.current_tenant',true),'')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id=sessoes.usuario_id AND u.empresa_id=NULLIF(current_setting('app.current_tenant',true),'')));
