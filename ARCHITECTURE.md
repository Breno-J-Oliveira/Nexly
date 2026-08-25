# Arquitetura do Nexly

> Documento de referência rápida para novos contribuidores. Para o **README**,
> instruções de setup e visão geral do produto, veja o [README.md](../README.md).

## Visão geral

O Nexly é um SaaS **multi-tenant** para gestão de pequenos negócios.
A arquitetura é orientada a **domínios** (auth, agenda, estoque, vendas, dashboard)
e isolada por **tenant** em duas camadas — uma no código (Prisma Extension) e outra
no banco (Row-Level Security).

```
┌──────────────────────────────────────────────────────────┐
│          Frontend (Next.js 14 — :3000)                   │
│      App Router + Tailwind dark + Recharts               │
│   axios + useAuth + middleware de proteção de rotas      │
└──────────────────┬───────────────────────────────────────┘
                   │ REST + JWT (Bearer) + refresh cookie
┌──────────────────▼───────────────────────────────────────┐
│           Backend (NestJS 10 — :3001)                    │
│  auth │ usuarios │ clientes │ profissionais │ servicos    │
│  agendamentos │ produtos │ estoque │ vendas │ dashboard   │
│           + Redis (cache) + EventEmitter (baixa auto)    │
└────────┬───────────────────┬────────────────────────────┘
         │                   │
┌────────▼─────────┐   ┌──────▼────────┐
│   PostgreSQL    │   │     Redis     │
│   (RLS multi-    │   │  (5 min TTL)  │
│    tenant)        │   └───────────────┘
└──────────────────┘
```

## Isolamento multi-tenant (defesa em profundidade)

```
┌────────────────────┐
│ Request HTTP        │
│ + JWT (Authorization│
│   Bearer)           │
└─────────┬──────────┘
          │
┌─────────▼──────────┐
│ AuthGuard           │  ← valida token, extrai payload
│ (NestJS Guard)     │     (sub, empresaId, role, email)
└─────────┬──────────┘
          │
┌─────────▼──────────────────────────────────┐
│ TenantInterceptor                          │
│  → tenantStorage.run(ctx, () => handler()) │  ← AsyncLocalStorage
└─────────┬──────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────┐
│ Service (ex: EstoqueService.registrarSaida)        │
│  prisma.client.produto.create({ data: { ... } })   │
└─────────┬──────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────┐
│ Prisma Extension (tenantExtension)            │
│  → inverte `empresaId` em todo create/find*  │  ← Camada 1
│  → injeta `where.empresaId` em todas reads    │
└─────────┬────────────────────────────────────┘
          │
┌─────────▼────────────────────────────────────┐
│ PostgreSQL                                    │
│  → RLS policies em seed-rls.sql              │  ← Camada 2
│  → defesa se alguém desativar a extension     │
└──────────────────────────────────────────────┘
```

**Por que duas camadas?** Defense in depth: a Extension injeta `empresaId` em
queries que passam pelo `PrismaService.client`. A RLS do banco blinda mesmo
queries que escapem (manutenção mal-feita, SQL direto, mudança de código).

## Baixa automática de estoque (feature central)

```
Cliente marca atendimento como CONCLUIDO (PATCH /agendamentos/:id/status)
  │
  ▼
AgendamentosService.atualizarStatus()
  ├─── valida transição de status
  ├─── grava no banco
  └─── EventEmitter.emit('agendamento.concluido', { agendamentoId, servicoId })
        │
        ▼
  EstoqueIntegracaoService @OnEvent('agendamento.concluido')
    ├─── busca insumos configurados para o serviço (insumo_servico)
    ├─── para cada insumo:
    │     ├─── EstoqueService.registrarSaida()
    │     │     ├─── valida saldo (atomic decrement)
    │     │     └─── cria MovimentacaoEstoque (tipo: SAIDA)
    │     └─── on error → log + segue (não bloqueia o atendimento)
```

**Por que event-driven?** O listener está desacoplado do `AgendamentosService`
— qualquer módulo futuro pode emitir o mesmo evento. Trocar o motor de
baixa é tão simples quanto escrever outro listener.

## Autenticação (JWT + refresh token)

```
Login (POST /auth/login)
  ├─── valida credenciais
  ├─── gera accessToken (JWT RS256, 15 min)
  ├─── gera refreshToken (32 bytes, hash sha256)
  └─── retorna { accessToken } + seta cookie HttpOnly (refresh)

Request comum
  └─── Authorization: Bearer <accessToken> → AuthGuard → req.user

Access token expirado?
  └─── axios interceptor (lib/api.ts)
        → POST /auth/refresh (envia cookie automaticamente)
        → se ok: setAccessToken(token) + retry request original
        → se 401: redireciona para /login

Refresh token reutilizado (roubo)?
  └─── TokenService.rotateRefreshToken() detecta e invalida TODAS as sessões
```

## Estrutura de pastas (backend)

```
apps/api/src/
├── auth/                    # JWT + refresh rotation
├── usuarios/                # CRUD usuários
├── clientes/                # Clientes (agenda)
├── profissionais/           # Profissionais (agenda)
├── servicos/                # Serviços + insumos
├── agendamentos/            # Agendamentos (validação de conflito)
├── produtos/                # Produtos (estoque)
├── estoque/                 # Motor de movimentação + integração
│   ├── estoque.service.ts
│   ├── estoque-integracao.service.ts   # ⭐ Listener
│   └── estoque.controller.ts
├── vendas/                  # Motor do PDV (transação)
├── dashboard/               # Métricas + cache Redis
├── relatorios/              # Insumos por serviço + horários de pico
├── redis/                   # Cache helper
├── common/                  # guards, decorators, filters, interceptors
├── database/                # PrismaService + tenant extension
├── config/                  # env validation (Zod) + JWT keys
└── health/                  # Health check
```

## Stack e decisões

| Decisão | Justificativa |
|---|---|
| **Monorepo Turborepo** | Compartilhar tipos e utilitários entre frontend/backend sem publicar pacotes |
| **Prisma + PostgreSQL com RLS** | Tipagem forte + isolamento real no banco |
| **Prisma Extension (Query)** | Injeta `empresaId` no where/data em todas queries — sem repetir em cada `findMany` |
| **AsyncLocalStorage para tenant** | Propaga contexto de tenant sem precisar passar parâmetro em cada chamada |
| **Event-driven (EventEmitter2)** | Baixa de estoque desacoplada do service que emite — extensível |
| **JWT RS256 + cookie HttpOnly** | Stateless, simétrico, com refresh rotativo e detecção de reuso |
| **Argon2id** | Hash de senha com resistência a GPU/ASIC |
| **Cache em Redis (5 min)** | O dashboard é o endpoint mais lido e os dados só mudam com ações |
| **Zod (frontend) + class-validator (backend)** | DTOs validados na borda — defesa em camadas |

## Códigos de erro semânticos

Toda `HttpException` lançada pelo backend pode carregar um `code` no corpo
da resposta (`{ code, message, statusCode, ... }`). O front-end usa
`parseApiError` (em `apps/web/src/lib/errors.ts`) para fazer tratamento
programático — ex: `if (err.code === 'BUSY_PROFESSIONAL') { mostrar "escolha outro horário" }`.

| Code | Status | Onde é lançado | Mensagem |
|---|---|---|---|
| `BUSY_PROFESSIONAL` | 409 | `agendamentos.service.ts` (validação de conflito) | Profissional já tem agendamento nesse horário |
| `INVALID_DATETIME` | 400 | `agendamentos.service.ts` | Data/hora inválida |
| `DATETIME_IN_PAST` | 400 | `agendamentos.service.ts` | O horário do agendamento deve ser no futuro |
| `OUT_OF_STOCK` | 409 | `estoque.service.ts` | Saldo insuficiente em estoque |
| `EMAIL_TAKEN` | 409 | `auth.service.ts` (register) | E-mail já cadastrado |
| `USER_NOT_FOUND` | 401 | `auth.service.ts` (`me`) | Usuário não encontrado |

## Endpoints públicos de saúde

- `GET /health` — liveness, sempre 200 enquanto o processo Node estiver vivo.
- `GET /health/deep` — testa DB + Redis; retorna `degraded` se algo falhar.
- `GET /health/migrations` — status das migrations Prisma aplicadas.
- `GET /health/version` — versão do `package.json` + Node + env.
Se a primeira falhar, a segunda segura.