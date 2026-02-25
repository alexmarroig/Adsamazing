# Ads Autopilot Monorepo

Monorepo TypeScript com **pnpm workspaces** para o SaaS Ads Autopilot.

## Stack

- Node.js 20 LTS
- pnpm
- Next.js 15 (App Router) + Tailwind + componentes estilo shadcn/ui
- Fastify API
- BullMQ Worker + Scheduler
- Prisma ORM
- Zod para schemas/validação
- Pino para logging
- dotenv + zod para validação de env
- Docker Compose para Redis + Postgres local
- Produção planejada para Supabase Postgres (via `DATABASE_URL`)

## Estrutura

```txt
apps/
  web/       # Next.js 15+ (login/dashboard placeholders)
  api/       # Fastify (health, me, oauth start/callback)
  worker/    # BullMQ queue `sync_metrics` + scheduler
packages/
  db/        # Prisma schema + client
  shared/    # tipos utilitários + zod + crypto AES-256-GCM
```

## Pré-requisitos

- Node 20+
- pnpm 9+
- Docker + Docker Compose

## Setup local

1. Copie variáveis de ambiente:

```bash
cp .env.example .env
```

2. Suba infraestrutura local:

```bash
docker compose up -d
```

3. Instale dependências:

```bash
pnpm install
```

4. Gere o Prisma Client:

```bash
pnpm --filter @ads/db prisma:generate
```

5. Rode migrações (opcional, recomendado):

```bash
pnpm --filter @ads/db prisma:migrate
```

6. Rode tudo em modo dev (web + api + worker):

```bash
pnpm dev
```

## Scripts úteis (raiz)

- `pnpm dev`: sobe `web`, `api` e `worker`
- `pnpm lint`: lint em todos os pacotes/apps
- `pnpm typecheck`: TypeScript check em todos
- `pnpm build`: build de todo o workspace

## Segurança

- Tokens devem ser criptografados com **AES-256-GCM** via `ENCRYPTION_KEY` (base64 de 32 bytes).
- Não logar tokens em nenhum fluxo.
- API usa middleware MVP de autenticação por `x-user-id`, preparado para troca por Supabase Auth depois.

## Rotas da API

- `GET /health`
- `GET /v1/me` (placeholder; requer `x-user-id`)
- `GET /v1/google/oauth/start` (placeholder URL)
- `GET /v1/google/oauth/callback` (placeholder)

## Banco de dados

Schema Prisma em `packages/db/prisma/schema.prisma` com tabelas:

- `users`
- `google_connections`
- `ad_accounts`
- `sync_runs`

Em produção, basta apontar `DATABASE_URL` para Supabase Postgres.

## Deploy no Railway

Este repositório fixa `pnpm@10.0.0` no `packageManager` e usa comandos diretos com `pnpm` (sem `corepack enable`).

Configure com Root Directory na raiz (`/`) e dois services separados.

API service:

- Build Command: `pnpm --filter @ads/api... build`
- Start Command: `pnpm --filter @ads/api start`

Worker service:

- Build Command: `pnpm --filter @ads/worker build`
- Start Command: `pnpm --filter @ads/worker start`

Se ainda falhar, faça redeploy com *Clear build cache*.
Para evitar o fallback automático para `npm` (e o erro `pnpm: not found`), este repositório define **`nixpacks.toml`** com as fases explícitas de build:

- setup: instala `nodejs_20` e `pnpm` via Nix
- install: `pnpm install --no-frozen-lockfile`
- build: `pnpm --filter @ads/api... build`
- start: `pnpm --filter @ads/api start`

> Importante: no painel do Railway, deixe o serviço usar a configuração do repositório. Se Build/Start Command estiverem preenchidos manualmente com `pnpm ...`, eles podem sobrescrever essa config e manter o erro.

Para o worker, use um serviço separado com:

- Build Command: `pnpm --filter @ads/worker build`
- Start Command: `pnpm --filter @ads/worker start`

Para evitar fallback para `npm` em monorepo, este repositório inclui `pnpm-lock.yaml` e `railway.toml`.

- Build Command: `pnpm --filter @ads/api... build`
- Start Command: `pnpm --filter @ads/api start`

O filtro `@ads/api...` garante build da API e dos pacotes de workspace dependentes (ex.: `@ads/db`).
