const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const fixture = path.join(root, 'apps/api/src', `sql-guard-fixture-${randomUUID()}.ts`);
try {
  fs.writeFileSync(
    fixture,
    "export {};\nconst db = {$queryRawUnsafe: (q: string) => q, $executeRawUnsafe: (q: string) => q}; console.log(db.$queryRawUnsafe('SELECT 1'), db['$executeRawUnsafe']('SELECT 1'));\n",
  );
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'node_modules/eslint/bin/eslint.js'), fixture, '--format', 'json'],
    { cwd: path.join(root, 'apps/api'), encoding: 'utf8' },
  );
  const reports = JSON.parse(result.stdout || '[]');
  const blocked = reports
    .flatMap((report) => report.messages)
    .filter((message) => message.ruleId === 'no-restricted-syntax');
  if (result.status !== 1 || blocked.length !== 2)
    throw new Error('A API precisa bloquear as duas formas de SQL inseguro. ' + result.stderr);
} finally {
  if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
}
console.log('PASS ESLint bloqueia as duas formas de acesso a SQL inseguro na API.');
