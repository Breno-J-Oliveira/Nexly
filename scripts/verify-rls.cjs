require('./local-api-env.cjs');
const { PrismaClient } = require('@prisma/client');
const assert = require('node:assert/strict');
const p = new PrismaClient();
let company;
let checks = 0;
function ok(value, message) {
  assert(value, message);
  checks++;
  console.log('PASS ' + message);
}
(async () => {
  const rows =
    await p.$queryRaw`SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'`;
  ok(rows.length === 31 && rows.every((r) => r.rowsecurity), '31 tabelas da aplicacao com RLS');
  const grants =
    await p.$queryRaw`SELECT table_name FROM information_schema.table_privileges WHERE table_schema='public' AND table_name<>'_prisma_migrations' AND grantee IN ('anon','authenticated','PUBLIC')`;
  ok(grants.length === 0, 'sem grants diretos de navegador ou PUBLIC nas tabelas');
  const roles =
    await p.$queryRaw`SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
  ok(
    !roles[0].rolsuper && !roles[0].rolbypassrls,
    'teste executado por proprietario sem bypass de superusuario',
  );
  company = await p.empresa.create({
    data: {
      nome: 'TESTE RLS descartavel',
      cnpj: `rls-${Date.now()}`,
      usuarios: {
        create: {
          nome: 'TESTE RLS',
          email: `rls-${Date.now()}@example.test`,
          senhaHash: 'fixture-nao-utilizavel-para-login',
        },
      },
    },
  });
  let triedInsert = false;
  let error;
  try {
    await p.$transaction(async (tx) => {
      await tx.$executeRaw`ALTER TABLE public.usuarios FORCE ROW LEVEL SECURITY`;
      await tx.$queryRaw`SELECT set_config('app.current_tenant','',true)`;
      const blocked =
        await tx.$queryRaw`SELECT count(*)::int AS n FROM public.usuarios WHERE empresa_id=${company.id}`;
      ok(blocked[0].n === 0, 'sem contexto nao le senha nem dados de usuario');
      await tx.$queryRaw`SELECT set_config('app.current_tenant',${company.id},true)`;
      const allowed =
        await tx.$queryRaw`SELECT count(*)::int AS n FROM public.usuarios WHERE empresa_id=${company.id}`;
      ok(allowed[0].n === 1, 'politica permite a empresa correta');
      await tx.$queryRaw`SELECT set_config('app.current_tenant','empresa-externa',true)`;
      const foreign =
        await tx.$queryRaw`SELECT count(*)::int AS n FROM public.usuarios WHERE empresa_id=${company.id}`;
      ok(foreign[0].n === 0, 'empresa externa nao enxerga o usuario');
      triedInsert = true;
      await tx.usuario.create({
        data: {
          empresaId: company.id,
          nome: 'TESTE insercao bloqueada',
          email: `rls-denied-${Date.now()}@example.test`,
          senhaHash: 'fixture-nao-utilizavel-para-login',
        },
      });
      throw Error('Insercao deveria ter sido negada');
    });
  } catch (e) {
    error = e;
  }
  ok(triedInsert && /42501/.test(String(error)), 'WITH CHECK bloqueia escrita cruzada no banco');
  const force =
    await p.$queryRaw`SELECT relforcerowsecurity FROM pg_class WHERE oid='public.usuarios'::regclass`;
  ok(!force[0].relforcerowsecurity, 'FORCE temporario revertido por rollback; runtime preservado');
  console.log(checks + ' verificacoes RLS passaram');
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (company) await p.empresa.delete({ where: { id: company.id } });
    await p.$disconnect();
  });
