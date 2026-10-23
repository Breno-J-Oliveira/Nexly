const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const prettier = require('prettier');

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const file = path.join(dir, item.name);
    return item.isDirectory() ? walk(file) : [file];
  });
const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
const decorators = (node) => (ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []);
const calls = (node) =>
  decorators(node)
    .map((d) => d.expression)
    .filter(ts.isCallExpression);
const literals = (node) => {
  if (!node) return [''];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(literals);
  throw new Error('Rota dinâmica exige revisão documental: ' + node.getText());
};

async function references() {
  let api = '# Referência da API\n\n';
  api +=
    'Inventário gerado dos decorators NestJS pelo comando `node scripts/documentation.cjs generate`. Todas as rotas abaixo incluem o prefixo `/api`. DTOs, guards e serviços definem validação, acesso e comportamento; a coluna de decorators registra declarações explícitas, sem substituir a política global. Swagger fica disponível em desenvolvimento em `/api/docs`.\n\n';
  let routes = 0;
  for (const file of walk(path.join(root, 'apps/api/src'))
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .sort()) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of source.statements.filter(ts.isClassDeclaration)) {
      const controller = calls(statement).find(
        (d) => d.expression.getText(source) === 'Controller',
      );
      if (!controller) continue;
      api += `## ${statement.name.text}\n\nFonte: [${relative(file)}](../${relative(file)}).\n\n`;
      api +=
        '| Método | Caminho | Operação no controller | Decorators de acesso explícitos |\n| --- | --- | --- | --- |\n';
      for (const member of statement.members.filter(ts.isMethodDeclaration)) {
        for (const route of calls(member).filter((d) =>
          /^(Get|Post|Put|Patch|Delete|Options|Head|All)$/.test(d.expression.getText(source)),
        )) {
          const access =
            [...calls(statement), ...calls(member)]
              .filter((d) =>
                /^(Public|Roles|RequirePermission|RequirePermissions|Permissions)$/.test(
                  d.expression.getText(source),
                ),
              )
              .map((d) => d.getText(source).replace(/\s+/g, ' ').replaceAll('|', '\\|'))
              .join('; ') || 'Política global e verificações do fluxo';
          for (const prefix of literals(controller.arguments[0]))
            for (const suffix of literals(route.arguments[0])) {
              const endpoint =
                '/' +
                ['api', prefix, suffix]
                  .filter(Boolean)
                  .join('/')
                  .replace(/\/{2,}/g, '/');
              api += `| ${route.expression.getText(source).toUpperCase()} | \`${endpoint}\` | \`${member.name.getText(source)}\` | ${access} |\n`;
              routes++;
            }
        }
      }
      api += '\n';
    }
  }
  api += `Total de declarações de rota nesta revisão: **${routes}**.\n`;
  const schema = read('apps/api/prisma/schema.prisma');
  const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
  const enums = [...schema.matchAll(/^enum (\w+) \{([\s\S]*?)^\}/gm)];
  let data = '# Modelo de dados\n\n';
  data +=
    'Inventário gerado de [schema.prisma](../apps/api/prisma/schema.prisma). Prisma descreve modelos (grupos de registros), campos e relações. `?` indica campo opcional e `[]` indica uma coleção relacionada. `id` identifica o registro; relações e chaves ligam registros. Migrações em `apps/api/prisma/migrations` registram a evolução. Valores padrão, índices, constraints e regras completas devem ser consultados no schema.\n\n';
  data +=
    'O PostgreSQL é a persistência principal; Redis não aparece como tabela neste inventário. `empresaId` identifica escopo direto quando presente. Modelos sem esse campo podem ser globais ou vinculados por relações; confira o [escopo da aplicação](../apps/api/src/database/tenant-scope.ts), a autorização e as políticas do banco antes de utilizá-los.\n\n';
  data += `Esta revisão contém **${models.length} modelos** e **${enums.length} enumerações**.\n\n`;
  for (const [, name, body] of models) {
    const table = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? name;
    data += `## ${name}\n\nTabela: \`${table}\`.\n\n| Campo | Tipo Prisma |\n| --- | --- |\n`;
    for (const line of body.split('\n')) {
      const field = line.match(/^\s*(\w+)\s+(\w+[?\[\]]*)\s*(?:@|$)/);
      if (field) data += `| \`${field[1]}\` | \`${field[2]}\` |\n`;
    }
    data += '\n';
  }
  data += '## Enumerações\n\n';
  for (const [, name, body] of enums) {
    const values = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^[A-Za-z]\w*(?:\s+@.*)?$/.test(line))
      .map((line) => line.split(/\s/)[0]);
    data += `- **${name}:** ${values.map((v) => '`' + v + '`').join(', ')}.\n`;
  }
  const result = new Map([
    ['REFERENCIA_API.md', api],
    ['MODELO_DADOS.md', data],
  ]);
  for (const [name, content] of result)
    result.set(name, await prettier.format(content, { parser: 'markdown' }));
  return { result, routes, models: models.length };
}

async function main() {
  const generated = await references();
  if (process.argv[2] === 'generate') {
    for (const [name, content] of generated.result)
      fs.writeFileSync(path.join(docs, name), content);
    console.log(`Referências geradas: ${generated.routes} rotas; ${generated.models} modelos.`);
    return;
  }
  const failures = [];
  for (const [name, content] of generated.result)
    if (fs.readFileSync(path.join(docs, name), 'utf8') !== content)
      failures.push(`Referência desatualizada: ${name}`);
  const files = [path.join(root, 'README.md'), ...walk(docs).filter((f) => f.endsWith('.md'))];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(/(?:\]\(|(?:src|href)=")([^\s)"<>]+)/g)) {
      const href = match[1];
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(href.split('#')[0]));
      if (!fs.existsSync(target)) failures.push(`Link quebrado em ${relative(file)}: ${href}`);
    }
    if (
      /sk_(?:live|test)_[A-Za-z0-9]{16,}|rk_(?:live|test)_[A-Za-z0-9]{16,}|-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(
        content,
      )
    )
      failures.push(`Possível segredo em ${relative(file)}`);
  }
  for (const file of walk(path.join(root, 'e2e')).filter((f) => f.endsWith('.ts'))) {
    if (/['"`]docs\//.test(fs.readFileSync(file, 'utf8')))
      failures.push(`Artefato de teste ainda usa docs: ${relative(file)}`);
  }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log(
    `Documentação validada: ${files.length} Markdown, links locais, ausência de segredos reconhecíveis, ${generated.routes} rotas e ${generated.models} modelos sincronizados.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
