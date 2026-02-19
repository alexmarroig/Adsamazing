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
