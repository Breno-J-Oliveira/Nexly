CREATE TYPE public."PlatformRole" AS ENUM ('OWNER', 'OPERATIONS', 'FINANCE', 'VIEWER');

CREATE TABLE public.platform_members (
    id TEXT NOT NULL,
    usuario_id TEXT NOT NULL,
    papel public."PlatformRole" NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP(3) NOT NULL,
    CONSTRAINT platform_members_pkey PRIMARY KEY (id),
    CONSTRAINT platform_members_usuario_id_fkey FOREIGN KEY (usuario_id)
        REFERENCES public.usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX platform_members_usuario_id_key ON public.platform_members(usuario_id);

ALTER TABLE public.platform_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.platform_members FROM PUBLIC;

DO $migration$
DECLARE client_role TEXT;
BEGIN
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.platform_members FROM %I', client_role);
        END IF;
    END LOOP;
END $migration$;
