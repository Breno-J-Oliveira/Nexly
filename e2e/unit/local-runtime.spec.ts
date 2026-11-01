import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

function checkRuntime(file: string, version: string): void {
  const filename = path.resolve('scripts', file);
  const nativeRequire = createRequire(filename);
  // Only the script source comes from disk. Its environment checks use isolated fixtures,
  // so CI and developer-specific .env files cannot change the runtime assertions.
  const envFixtures = new Map([
    [path.resolve('apps/api/.env'), 'DATABASE_URL=postgresql://test:test@localhost:5432/nexly_test\nDIRECT_URL=postgresql://test:test@127.0.0.1:5432/nexly_test\nREDIS_URL=redis://localhost:6379\n'],
    [path.resolve('apps/web/.env'), 'NEXT_PUBLIC_API_URL=http://localhost:3001\n'],
  ]);
  const fixtureFs = {
    existsSync(file: string) {
      return envFixtures.has(file);
    },
    readFileSync(file: string) {
      const contents = envFixtures.get(file);
      if (contents === undefined) throw new Error(`Unexpected fixture path: ${file}`);
      return Buffer.from(contents, 'utf8');
    },
  };

  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    __dirname: path.dirname(filename),
    URL,
    console: { log() {}, error() {} },
    process: {
      versions: { node: version },
      exit(code: number) {
        throw new Error(`Unsupported runtime: ${code}`);
      },
    },
    require(name: string) {
      if (name === 'node:fs') return fixtureFs;
      if (name === './check-node-version.cjs') {
        checkRuntime('check-node-version.cjs', version);
        return {};
      }
      return nativeRequire(name);
    },
  });
}

test('o iniciador local rejeita as mesmas versões inseguras que instalação e build', () => {
  for (const version of ['22.23.4', '24.12.0', '24.15.0', '24.22.0', '25.0.0', '26.0.0']) {
    expect(() => checkRuntime('check-node-version.cjs', version), version).toThrow();
    expect(() => checkRuntime('check-local-env.cjs', version), version).toThrow();
  }
});

test('o iniciador local aceita o runtime suportado com as conexões locais de teste', () => {
  for (const version of ['24.22.1', '24.23.0']) {
    expect(() => checkRuntime('check-node-version.cjs', version), version).not.toThrow();
    expect(() => checkRuntime('check-local-env.cjs', version), version).not.toThrow();
  }
});
