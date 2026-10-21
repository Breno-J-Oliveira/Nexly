const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient, Prisma } = require('@prisma/client');

const database = new URL(process.env.DATABASE_URL || 'http://unavailable');
if (!['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) {
  throw new Error('Teste de privilégios permitido somente no PostgreSQL local.');
}
const db = new PrismaClient();
const rollback = new Error('ROLLBACK_SECURITY_FIXTURE');
const migration = fs.readFileSync(
  path.join(
    __dirname,
    '../apps/api/prisma/migrations/20261020220000_private_operational_grants/migration.sql',
  ),
  'utf8',
);

async function main() {
  let passed = false;
  await db
    .$transaction(
      async (tx) => {
        // Roles NOLOGIN e concessões são fixtures transacionais, nunca persistidas.
        await tx.$executeRaw`DO $fixture$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
      END $fixture$;`;
        await tx.$executeRaw`GRANT ALL PRIVILEGES ON TABLE public.lancamentos_financeiros, public.saldos_filiais, public.jobs_duraveis, public.importacoes, public.comprovacoes_operacionais, public.transferencias_filiais, public.baixas_financeiras, public.recuperacoes_senha TO anon, authenticated`;
        await tx.$executeRaw`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO anon, authenticated`;
        await tx.$executeRaw`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO anon, authenticated`;
        await tx.$executeRaw`GRANT SELECT ON TABLE public.recuperacoes_senha TO service_role`;
        await tx.$executeRaw`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO service_role`;
        await tx.$executeRaw`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO service_role`;
        const before =
          await tx.$queryRaw`SELECT has_table_privilege('anon', 'public.recuperacoes_senha', 'SELECT') AS allowed`;
        assert.equal(before[0].allowed, true, 'fixture reproduz a concessão desnecessária');

        // DDL vem exclusivamente do arquivo versionado fixo acima, sem entrada externa.
        await tx.$executeRaw(Prisma.raw(migration));
        await tx.$executeRaw(Prisma.raw(migration));
        const rows = await tx.$queryRaw`
      SELECT t.tablename, r.rolname,
        has_table_privilege(r.rolname, format('public.%I', t.tablename), 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS client_access,
        has_table_privilege(current_user, format('public.%I', t.tablename), 'SELECT') AS backend_access,
        t.rowsecurity
      FROM pg_tables t CROSS JOIN pg_roles r
      WHERE t.schemaname='public'
        AND t.tablename IN ('lancamentos_financeiros','saldos_filiais','jobs_duraveis','importacoes','comprovacoes_operacionais','transferencias_filiais','baixas_financeiras','recuperacoes_senha')
        AND r.rolname IN ('anon','authenticated')`;
        assert.equal(rows.length, 16);
        for (const row of rows) {
          assert.equal(
            row.client_access,
            false,
            `${row.tablename}: ${row.rolname} não possui concessões`,
          );
          assert.equal(row.backend_access, true, `${row.tablename}: backend preservado`);
          assert.equal(row.rowsecurity, true, `${row.tablename}: RLS preservada`);
        }

        await tx.$executeRaw`CREATE TABLE public.nexly_privacy_fixture (id bigint GENERATED ALWAYS AS IDENTITY)`;
        const future = await tx.$queryRaw`
      SELECT r.rolname,
        has_table_privilege(r.rolname, 'public.nexly_privacy_fixture', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS table_access,
        has_sequence_privilege(r.rolname, 'public.nexly_privacy_fixture_id_seq', 'SELECT,USAGE,UPDATE') AS sequence_access
      FROM pg_roles r WHERE r.rolname IN ('anon','authenticated')`;
        assert.equal(future.length, 2);
        for (const row of future) {
          assert.equal(row.table_access, false, `${row.rolname}: tabela futura privada`);
          assert.equal(row.sequence_access, false, `${row.rolname}: sequência futura privada`);
        }
        const service =
          await tx.$queryRaw`SELECT has_table_privilege('service_role', 'public.recuperacoes_senha', 'SELECT') AS existing_access, has_table_privilege('service_role', 'public.nexly_privacy_fixture', 'SELECT') AS future_access, has_sequence_privilege('service_role', 'public.nexly_privacy_fixture_id_seq', 'USAGE') AS sequence_access`;
        assert.deepEqual(service[0], {
          existing_access: true,
          future_access: true,
          sequence_access: true,
        });
        passed = true;
        throw rollback;
      },
      { timeout: 30000 },
    )
    .catch((error) => {
      if (error !== rollback) throw error;
    });
  assert.equal(passed, true);
  const fixtures =
    await db.$queryRaw`SELECT to_regclass('public.nexly_privacy_fixture')::text AS remaining`;
  assert.equal(fixtures[0].remaining, null);
  console.log(
    'PASS privilégios de 8 tabelas, 2 roles, objetos futuros, idempotência e rollback integral.',
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
