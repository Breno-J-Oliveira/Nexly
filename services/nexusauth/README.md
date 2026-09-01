# NexusAuth — Microsservico de Autenticacao Centralizada

<p align="center">
  <img src="docs/logo/logo 16x9.png" alt="NexusAuth Banner" width="640">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/JWT-RS256-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT RS256">
  <br>
  <img src="https://img.shields.io/badge/CI-passing-brightgreen?style=flat-square&logo=githubactions&logoColor=white" alt="CI">
  <img src="https://img.shields.io/badge/tests-30%2F30-brightgreen?style=flat-square&logo=jest&logoColor=white" alt="Tests">
  <img src="https://img.shields.io/badge/segurança-59%2F59-brightgreen?style=flat-square&logo=shield&logoColor=white" alt="Security">
  <img src="https://img.shields.io/badge/licença-MIT-blue?style=flat-square" alt="License">
</p>

---

## O que e o NexusAuth?

O **NexusAuth** e um servico completo de autenticacao e autorizacao, construido como API REST independente. Ele resolve o problema de "criar sistema de login do zero" para qualquer aplicacao — seja um SaaS multi-tenant, um dashboard, um e-commerce ou um app mobile.

**Plug-and-play:** qualquer aplicacao integra em minutos. O usuario cria a conta uma vez e acessa todos os seus apps com o mesmo login (Single Sign-On).

Projeto desenvolvido como **portfolio pessoal** (solo), demonstrando dominio de seguranca, arquitetura de microsservicos e boas praticas de APIs modernas.

---

## O que ele entrega?

### Para o usuario final
- Cadastro com confirmacao de email
- Login tradicional (email + senha)
- Login rapido com Google ou GitHub
- Login sem senha via Magic Link enviado no email
- Autenticacao em dois fatores (2FA) com Google Authenticator
- Recuperacao de senha por email
- Painel de sessoes ativas (ve e revoga dispositivos conectados)
- Exportacao e exclusao de dados pessoais (LGPD/GDPR)

### Para o desenvolvedor
- **API REST completa** com documentacao Swagger interativa
- **JWT com RS256** (chave publica/privada) — muito mais seguro que HS256
- **Endpoint JWKS** (`/.well-known/jwks.json`) para validacao sem compartilhar segredos
- **Multi-tenant nativo** — cada cliente tem seu `tenant_id` isolado no JWT
- **SDK compartilhado** (`@nexus/auth-sdk`) para integrar em minutos
- **Webhooks** que notificam seus apps em tempo real (login, registro, alteracao de senha, etc.)
- **API Keys** para autenticacao servico-a-servico (microservicos, cron jobs, pipelines CI/CD)
- **RBAC completo** — ADMIN, MANAGER, USER com permissoes granulares
- **Impersonation** — administradores podem agir como um usuario especifico (tudo auditado)
- **Metricas Prometheus** prontas para Grafana
- **Health checks** para Kubernetes (liveness + readiness)

### Para o SaaS / Empresa
- **Single Sign-On real** — mesma conta em todos os apps do ecossistema
- **Multi-tenant completo** — isole clientes sem duplicar infraestrutura
- **Login social** — menos friccao, mais conversao
- **2FA** — requisito para clientes enterprise e compliance
- **LGPD/GDPR compliant** — export, delete, consentimento granular
- **12 camadas de defesa** — pronto para ir a producao com seguranca enterprise-grade
- **Dockerizado** — sobe com um comando

---

## Como funciona?

### Fluxo de Login Tradicional

```
1. App envia email + senha para POST /auth/login
2. NexusAuth verifica:
   - Rate limit (maximo 5 tentativas/min por IP)
   - Lockout (conta bloqueada apos 5 falhas consecutivas)
   - Senha (bcrypt, 12 rounds)
   - Email verificado (obrigatorio em producao)
3. Se usuario tem 2FA ativo: retorna challengeToken
   App envia codigo TOTP para POST /2fa/challenge
4. NexusAuth gera:
   - Access Token (JWT RS256, 15 minutos)
   - Refresh Token (UUID, 7 dias, rotacionado a cada uso)
5. App usa Access Token no header Authorization: Bearer
6. App renova com Refresh Token quando expira
7. App faz logout: token e imediatamente invalidado (blacklist no Redis)
```

### Fluxo OAuth2 (Google)

```
1. App redireciona usuario para GET /auth/google
2. Usuario faz login no Google e concede permissao
3. Google redireciona para /auth/google/callback
4. NexusAuth verifica que o email foi confirmado pelo Google
5. Se usuario existe: vincula conta Google
   Se nao existe: cria conta nova
6. Tokens emitidos — mesmo fluxo do login tradicional
```

### Fluxo Magic Link

```
1. App envia email para POST /auth/magic-link
2. Usuario recebe email com link (valido por 15 minutos)
3. Usuario clica no link ou app envia token para POST /auth/magic-link/verify
4. NexusAuth valida e emite tokens sem senha
```

---

## Arquitetura

```
Client (Browser / App / Microservice)
        |
        | HTTPS + JWT Bearer / API Key
        |
        v
Load Balancer / WAF
        |
        | HTTP (trust proxy)
        |
        v
NexusAuth API  :3000
  |
  |-- Middlewares:  Helmet, CORS, CSP, Body Parser, Security Headers
  |-- Guards:       ThrottlerGuard > JwtAuthGuard > ApiKeyGuard > RolesGuard
  |-- Interceptors: Logging (Pino), Metrics (Prometheus), Idempotency
  |-- Pipes:        ZodValidation
  |
  +----> PostgreSQL 16  (users, sessions, tenants, audit)
  +----> Redis 7        (cache, blacklist, rate limit, 2fa pending)
        |
        +--> SMTP (emails: verify, reset, magic link)
```

---

## Protecoes integradas

O NexusAuth inclui protecoes de seguranca em todas as camadas — nao precisa configurar nada extra.

| Camada | O que protege |
|--------|---------------|
| **Transporte** | HTTPS forcado via HSTS (2 anos, includeSubDomains, preload) |
| **Headers** | CSP restrito, COOP, CORP, Permissions-Policy, X-Frame-Options: deny |
| **CORS** | Allowlist explicita — nunca reflete Origin, bloqueia tudo sem configuracao |
| **Autenticacao** | JWT RS256 com algoritmo fixo `['RS256']`, JTI blacklist no Redis, sessao validada a cada request |
| **Senhas** | bcrypt 12 rounds + dummy hash anti-timing + validacao contra Have I Been Pwned (k-anonymity) |
| **Tokens** | Refresh Token Family: se um token revogado for reusado, TODAS as sessoes sao revogadas |
| **2FA** | TOTP com backup codes, anti-replay (codigo ja usado e bloqueado), segredo encriptado em AES-256-GCM |
| **Rate Limiting** | 3 camadas: global (100 req/min/IP), por email, por endpoint — lockout de 15min apos 5 falhas |
| **SSRF** | Bloqueio de IPs privados, metadata services (AWS/GCP/Azure), protocolos perigosos |
| **Validacao** | Zod + class-validator, body limit 100kb, tokens limitados a 4096 caracteres |
| **Multi-tenant** | Isolamento por `tenant_id` no JWT, bloqueio de impersonation cross-tenant |
| **RBAC** | ADMIN, MANAGER, USER com permissoes granulares (`users:read`, `billing:manage`) |
| **Idempotency** | Header `Idempotency-Key` com SHA-256 body hash, deteccao de JSON circular |
| **Resiliencia** | Circuit Breaker no Redis (5 falhas = circuito aberto 30s), degradacao graciosa |
| **Auditoria** | Logs estruturados (Pino) com correlation ID, redact de dados sensiveis, hash chain |
| **LGPD/GDPR** | Export de dados com checksum SHA-256, soft/hard delete, consentimento granular |
| **Observabilidade** | Metricas Prometheus, health checks (liveness + readiness), logs JSON |

### Anti-enumeracao de usuario

Todas as respostas usam mensagens genericas para impedir atacantes de descobrirem quais emails estao cadastrados:

- Login: `"Invalid email or password"` (tanto para senha errada quanto email nao verificado)
- Registro: `"If this email is not already registered, an account has been created..."`
- Recuperacao de senha: `"If the email exists, a reset link has been sent"`
- Magic Link: `"If the email exists, a magic link has been sent"`

---

## Stack Tecnologica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20+ |
| Framework | NestJS 10.4 |
| Linguagem | TypeScript 5.5 |
| ORM | Prisma 5.18 (queries parametrizadas) |
| Banco | PostgreSQL 16 |
| Cache / Blacklist / Rate Limit | Redis 7 |
| Hashing | bcrypt 5.1 (12 rounds) |
| JWT | jsonwebtoken 9.0 (RS256) |
| Criptografia | AES-256-GCM (TOTP secrets) |
| 2FA | otplib 12.0 (TOTP) |
| OAuth2 | passport-google-oauth20, passport-github2 |
| Validacao | Zod 3.23 + class-validator 0.14 |
| Documentacao | Swagger/OpenAPI 7.4 |
| Logs | Pino 9.3 (JSON estruturado) |
| Metricas | prom-client 15.1 |
| Seguranca | Helmet 7.1, cookie-parser 1.4 |
| Container | Docker + Docker Compose |

---

## API — Todos os Endpoints

### Autenticacao
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/auth/register` | Cadastro — envia email de verificacao |
| POST | `/auth/login` | Login — retorna access + refresh token |
| POST | `/auth/refresh` | Renova access token (rotation + protecao anti-replay) |
| POST | `/auth/logout` | Invalida token + revoga sessoes |
| POST | `/auth/forgot-password` | Solicita link de reset |
| POST | `/auth/reset-password` | Reseta senha com token |
| POST | `/auth/verify-email` | Confirma email |
| POST | `/auth/magic-link` | Solicita Magic Link |
| POST | `/auth/magic-link/verify` | Valida Magic Link e faz login |
| POST | `/auth/change-password` | Troca senha (autenticado) |
| GET | `/auth/me` | Dados do usuario logado |
| GET | `/auth/google` | Inicia login com Google |
| GET | `/auth/google/callback` | Callback do Google |
| GET | `/auth/github` | Inicia login com GitHub |
| GET | `/auth/github/callback` | Callback do GitHub |

### Autenticacao em 2 Fatores
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/2fa/setup` | Gera segredo e QR code TOTP |
| POST | `/2fa/verify` | Ativa 2FA (valida primeiro codigo) |
| POST | `/2fa/disable` | Desativa 2FA |
| POST | `/2fa/challenge` | Verifica codigo TOTP durante login |

### Sessoes
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/sessions` | Lista todas as sessoes ativas (dispositivo, IP, local) |
| DELETE | `/sessions/:id` | Revoga uma sessao especifica |
| POST | `/sessions/logout-all` | Revoga todas as sessoes (exceto atual) |

### LGPD / GDPR
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/me/data/export` | Exporta todos os dados pessoais |
| DELETE | `/me/data` | Soft delete (anonimiza) ou Hard delete (remove) |
| POST | `/me/data/consent` | Registra consentimentos (marketing, analytics, etc.) |

### Multi-Tenant
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/tenant` | Cria um novo tenant |
| POST | `/tenant/invite` | Convida usuario para o tenant (via email) |
| POST | `/tenant/invite/accept` | Aceita convite de tenant |
| GET | `/tenant/members` | Lista membros do tenant |

### Admin
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/admin/impersonate/:userId` | Admin assume identidade de usuario (auditado) |
| POST | `/admin/stop-impersonation` | Encerra impersonation |

### API Keys
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api-keys` | Cria chave de API (maximo 10 ativas) |
| GET | `/api-keys` | Lista chaves |
| DELETE | `/api-keys/:id` | Revoga chave |

### Webhooks
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/webhooks` | Registra endpoint de webhook |
| GET | `/webhooks` | Lista webhooks |
| PATCH | `/webhooks/:id` | Atualiza webhook |
| DELETE | `/webhooks/:id` | Remove webhook |
| GET | `/webhooks/:id/deliveries` | Historico de entregas (ultimas 20) |

### Infraestrutura
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/health/live` | Liveness probe (Kubernetes) |
| GET | `/health/ready` | Readiness probe (DB + Redis + Circuit Breaker) |
| GET | `/health` | Health completo |
| GET | `/metrics` | Metricas Prometheus |
| GET | `/.well-known/jwks.json` | Chave publica JWT |
| GET | `/docs` | Swagger UI (apenas desenvolvimento) |

---

## Metricas Disponiveis (Prometheus)

| Metrica | Descricao |
|---------|-----------|
| `http_requests_total` | Total de requests por metodo, rota e status |
| `http_request_duration_seconds` | Latencia de resposta (histograma) |
| `auth_registrations_total` | Total de registros |
| `auth_logins_total` | Logins (success/failed) |
| `auth_refresh_tokens_issued_total` | Refresh tokens emitidos |
| `auth_2fa_enabled_total` | 2FA ativado |
| `webhooks_dispatched_total` | Webhooks enviados (success/failed) |

---

## Variaveis de Ambiente Principais

| Variavel | Descricao | Padrao |
|----------|-----------|--------|
| `NODE_ENV` | Ambiente (development/production/test) | development |
| `PORT` | Porta da API | 3000 |
| `DATABASE_URL` | URL do PostgreSQL | — |
| `REDIS_URL` | URL do Redis | — |
| `ENCRYPTION_KEY` | Chave AES-256-GCM (64 chars hex) — obrigatoria em producao | — |
| `CORS_ORIGINS` | Origens permitidas (CSV) — obrigatoria em producao | — |
| `JWT_ACCESS_EXPIRES_IN` | Expiracao do access token | 15m |
| `JWT_REFRESH_EXPIRES_IN` | Expiracao do refresh token | 7d |
| `JWT_ISSUER` | Emissor do token | nexusauth |
| `REQUIRE_EMAIL_VERIFIED` | Exigir email verificado para login | true |
| `MAX_LOGIN_ATTEMPTS` | Tentativas ate lockout | 5 |
| `LOCKOUT_DURATION_MINUTES` | Duracao do lockout | 15 |
| `SESSION_TIMEOUT_HOURS` | Timeout absoluto de sessao | 168 (7 dias) |
| `SESSION_INACTIVITY_HOURS` | Timeout de inatividade | 24 |
| `REQUEST_BODY_LIMIT` | Tamanho maximo do body | 100kb |
| `TRUST_PROXY_HOPS` | Hops de proxy confiavel | 0 |

> Todas as variaveis estao documentadas em `.env.example`

---

## Como Rodar

### Pre-requisitos
- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento local sem Docker)
- OpenSSL (para gerar chaves RSA)

### 1. Clone

```bash
git clone https://github.com/Breno-J-Oliveira/NexusAuth.git
cd NexusAuth
cp .env.example .env
```

### 2. Suba com Docker

```bash
docker compose up -d
```

Servicos iniciados: PostgreSQL, Redis, NexusAuth API (porta 3000) e App de Teste (porta 4000).

### 3. Gere chaves RS256

```bash
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### 4. Execute as migrations

```bash
docker compose exec api npx prisma migrate deploy
```

### 5. Acesse

- **API:** http://localhost:3000
- **Swagger:** http://localhost:3000/docs
- **Health:** http://localhost:3000/health
- **JWKS:** http://localhost:3000/.well-known/jwks.json

---

## Deploy em Producao

### Checklist
- [ ] `ENCRYPTION_KEY` gerada (use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] `CORS_ORIGINS` com dominios especificos
- [ ] Chaves RS256 montadas via volume/secret (nunca gere ephemeral keys em producao)
- [ ] Senhas fortes para PostgreSQL e Redis
- [ ] `TRUST_PROXY_HOPS=1` se atras de nginx/ALB/Cloudflare
- [ ] HTTPS configurado no load balancer
- [ ] Metricas e logs centralizados

### Gerando chaves RS256 para producao

```bash
openssl genrsa -out keys/private.pem 4096
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
chmod 600 keys/private.pem
```

> Em producao com multiplas replicas, as chaves DEVEM ser montadas via volume persistente ou Kubernetes secret.

---

## Estrutura do Projeto

```
src/
├── common/
│   ├── guards/         JWT, ApiKey, Roles, Throttler
│   ├── decorators/     @Public, @CurrentUser, @Roles
│   ├── filters/        Global Exception Filter
│   ├── interceptors/   Logging (Pino), Metrics, Idempotency
│   ├── middleware/     Security Headers
│   ├── pipes/          Zod Validation
│   └── utils/          Crypto (AES-256-GCM, SHA-256),
│                       SSRF Guard, HIBP Check,
│                       Audit Integrity, Lockout, Circuit Breaker
├── config/             Validacao de ENV (Zod)
├── modules/
│   ├── auth/           Login, Refresh, Logout, Register, OAuth, Magic Link
│   ├── two-factor/     TOTP Setup, Verify, Disable, Challenge
│   ├── sessions/       Gestao de Sessoes
│   ├── audit/          Audit Log + Verificacao de Integridade
│   ├── tenant/         Multi-Tenant + Convites
│   ├── admin/          Impersonation
│   ├── webhooks/       Dispatch de Eventos + SSRF Validation
│   ├── api-keys/       Autenticacao Service-to-Service
│   ├── oauth/          Estrategias Google + GitHub
│   ├── jwks/           Endpoint JWKS
│   ├── health/         Health Checks + Circuit Breaker State
│   ├── metrics/        Prometheus Metrics
│   ├── lgpd/           Export/Delete/Consent (LGPD/GDPR)
│   └── threat-intel/   IP Reputation Scoring
├── prisma/             PrismaService + Schema
└── redis/              RedisService (com Circuit Breaker)
```

---

## Roadmap Futuro

| Feature | Status |
|---------|--------|
| WebAuthn / Passkeys (FIDO2) | Planejado |
| JWT Key Rotation Automatica | Planejado |
| Argon2id (substituir bcrypt) | Planejado |
| Mais provedores OAuth2 (Apple, Microsoft) | Planejado |
| Dashboard Admin Web | Planejado |
| Integracao com Vault (HashiCorp) | Planejado |
| SIEM Integration (Splunk/Elastic) | Planejado |

---

## 🔐 Segurança — Auditoria Completa (59/59 Vulnerabilidades Corrigidas)

O NexusAuth passou por **3 rodadas de auditoria de segurança**, vasculhando mais de 70 ficheiros. Todas as **59 vulnerabilidades** identificadas foram corrigidas:

| Severidade | Corrigidas |
|-----------|-----------|
| 🔴 Críticas | 14/14 |
| 🟠 Altas | 24/24 |
| 🟡 Médias | 14/14 |
| 🟢 Baixas | 7/7 |

### Destaques de Segurança

- **CAPTCHA** Cloudflare Turnstile no registo (anti-bot)
- **Rate limit** com 3 camadas: IP + device fingerprint + global
- **JWT RS256** com kid dinâmico e suporte a key rotation
- **SDK** com tokens em memória (imune a XSS) e HTTPS obrigatório para JWKS
- **Senhas** com validação de 115+ palavras fracas (PT/EN/ES)
- **Cookies** assinados via cookieParser
- **Headers** CSP, HSTS, X-Content-Type-Options, Permissions-Policy
- **Docker** containers com USER não-root
- **JWKS** com proteção anti-Host-Header-Injection
- **2FA** com lockout progressivo e replay protection

> 📄 Consulte o relatório completo em `docs/SECURITY_AUDIT.md`

---

<p align="center">
  <strong>⚡ Projeto finalizado — pronto para produção.</strong><br>
  59/59 vulnerabilidades corrigidas • 30/30 testes passando • tsc --noEmit exit 0
</p>

## Contatos e Redes Sociais

<p align="center">
  <a href="https://github.com/Breno-J-Oliveira" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://www.linkedin.com/in/breno-j-oliveira-672619352/" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
  </a>
  <a href="https://www.instagram.com/brenoov" target="_blank">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram">
  </a>
  <a href="https://x.com/BrenoJOliveira_" target="_blank">
    <img src="https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white" alt="X (Twitter)">
  </a>
</p>