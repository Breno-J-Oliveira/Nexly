# Instalação e desenvolvimento

## Pré-requisitos

Utilize Node.js da versão indicada em [.nvmrc](../.nvmrc), npm compatível com [package.json](../package.json), Git e PostgreSQL/Redis locais. Docker Compose pode fornecer os dois serviços sem instalar os bancos diretamente no sistema.

Os comandos abaixo partem da raiz do repositório. Não use credenciais de produção para experimentar seeds, migrações de desenvolvimento ou testes.

## Preparar o ambiente

```bash
npm ci
docker compose up -d postgres redis
```

Copie os exemplos sem sobrescrever arquivos já configurados:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

No PowerShell, use `Copy-Item` no lugar de `cp` se necessário. Verifique antes se o destino já existe. Os exemplos utilizam credenciais públicas de desenvolvimento; configure o banco local antes de iniciar.

| Arquivo         | Campos principais                                                             |
| --------------- | ----------------------------------------------------------------------------- |
| `.env`          | Portas e credenciais usadas pelo Docker Compose.                              |
| `apps/api/.env` | `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `CORS_ORIGIN` e opções do backend. |
| `apps/web/.env` | `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_SITE_URL`.                               |

No desenvolvimento nativo, frontend usa `http://localhost:3002`, API usa `http://localhost:3001` e o prefixo REST é `/api`. O container web escuta internamente na porta 3000; o mapeamento externo usa `WEB_PORT`. O host presente na URL deve coincidir com CORS e configurações das integrações.

`DIRECT_URL` aponta para conexão direta de migração. Em desenvolvimento pode usar o mesmo banco de `DATABASE_URL`; em hospedagens com pool de conexões as URLs podem ser diferentes. Senhas com caracteres reservados precisam de codificação adequada na URL.

## Preparar o banco e iniciar

```bash
npm run build --workspace @nexly/shared
npx prisma generate --schema apps/api/prisma/schema.prisma
npm run db:migrate --workspace @nexly/api
npm run dev
```

O comando `db:migrate` da API aplica migrações existentes. Para criar uma migração durante alteração de schema, use `npm run db:migrate:dev --workspace @nexly/api`. Não apague migrações já aplicadas para resolver divergências.

O banco de exemplo é opcional:

```bash
npm run db:seed
```

O seed cria dados fictícios e a conta `admin@nexly.com.br` com senha pública `nexly123`. Execute somente em banco local descartável. Essa conta não é credencial de administração de produção.

Em desenvolvimento, a API gera um par RSA temporário quando as chaves JWT não foram configuradas. Reiniciar nessa condição invalida a continuidade dos tokens. Em produção as chaves são obrigatórias; o script [generate-jwt-keys.sh](../scripts/generate-jwt-keys.sh) auxilia a geração. Nunca versione os arquivos privados.

## Endereços

| Recurso                     | Endereço local                          |
| --------------------------- | --------------------------------------- |
| Aplicação                   | <http://localhost:3002>                 |
| Saúde básica                | <http://localhost:3001/api/health>      |
| Saúde de PostgreSQL e Redis | <http://localhost:3001/api/health/deep> |
| Swagger em desenvolvimento  | <http://localhost:3001/api/docs>        |

O Swagger não é publicado em produção. Schemas, DTOs e permissões da API definem quais dados cada operação aceita.

## Comandos de manutenção

```bash
npm run typecheck --workspace @nexly/api
npm run typecheck --workspace @nexly/web
npm run typecheck:e2e
npm run lint
npm test --workspace @nexly/api -- --runInBand
npm run build
npm run e2e
```

Prepare o banco e as variáveis das fixtures antes dos testes E2E. A suíte utiliza dados temporários e pode criar empresas de teste. O CI demonstra o ambiente isolado em [.github/workflows/ci.yml](../.github/workflows/ci.yml).

No Windows, [start-local.ps1](../scripts/start-local.ps1) verifica ambiente e portas antes de iniciar a API e o frontend. O iniciador força integrações de comunicação desativadas no ambiente local e preserva processos que já ocupam as portas.

## Trabalho com economia de contexto

O RTK é uma ferramenta opcional da máquina do desenvolvedor; não é dependência da aplicação nem do deploy. Ele resume saídas de comandos, e `rtk gain` informa a economia medida pela ferramenta. Use busca direcionada, leia somente os trechos necessários e execute testes relacionados à alteração. Não há garantia de redução fixa de tokens ou de aumento dos limites do Codex.

O fluxo recomendado mantém código e documentação juntos, salva artefatos de testes em `test-results` e revisa o diff antes do commit. Diante de saída incompreensível, recupere o resultado completo conforme as instruções da versão instalada do RTK.

## Manter esta documentação

```bash
npm run docs:generate
npm run docs:check
```

O primeiro comando atualiza rotas e modelos a partir dos arquivos TypeScript e Prisma. O segundo confere sincronização, links locais, padrões reconhecíveis de segredos e ausência de artefatos de teste em `docs`. O conteúdo explicativo continua exigindo revisão humana; o verificador não comprova veracidade completa nem substitui gitleaks.

## Homologação de pagamentos

Use exclusivamente credenciais de teste no ambiente local. Não substitua a proteção por uma chave live. O gateway é configurado na inicialização; reinicie a API após alterar variáveis. O [guia de pagamentos](PAGAMENTOS.md) lista configurações, rotas, eventos e critérios de homologação. Nenhuma cobrança real é necessária para validar a documentação.
