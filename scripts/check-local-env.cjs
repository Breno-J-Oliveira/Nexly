const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
for (const [file, keys] of [
  ['apps/api/.env', ['DATABASE_URL', 'DIRECT_URL', 'REDIS_URL']],
  ['apps/web/.env', ['NEXT_PUBLIC_API_URL']],
]) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) throw new Error(`Configure ${file} antes de iniciar.`);
  const env = dotenv.parse(fs.readFileSync(fullPath));
  for (const key of keys) {
    const value = env[key];
    if (!value && key === 'DIRECT_URL') continue;
    if (!value || !localHosts.has(new URL(value).hostname)) {
      throw new Error(`${file}: ${key} precisa apontar para localhost para esta execução.`);
    }
  }
}
console.log('Ambiente local verificado: API, PostgreSQL e Redis em localhost.');
