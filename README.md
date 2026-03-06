# Ads Autopilot V1 (Ads + Afiliados)

Plataforma SaaS em monorepo para automa��o de Google Ads, descoberta de produtos afiliados, gera��o de landing pages e otimiza��o via workers.

## Stack

- Backend: Node.js + Fastify + TypeScript + Prisma + PostgreSQL
- Queue/Workers: Redis + BullMQ
- Frontend: Next.js 15 + React + Tailwind
- AI: OpenAI (copy, landing blocks, embeddings)
- Infra: Docker-compatible, deploy�vel em Railway

## Monorepo

```txt
apps/
  api/
  web/
  worker/
packages/
  db/
  shared/
  ads-engine/
  affiliate-engine/
  ai-engine/
  scraping-engine/
```

## M�dulos implementados

1. Google Ads automation engine (OAuth + customer discovery + m�tricas + sele��o de conta)
2. Affiliate product discovery engine (API-first + ranking)
3. Product scraping engine (Playwright em worker + feature flag)
4. Affiliate landing page generator (AI + JSON blocks + renderer Next.js)
5. Ad copy generation engine (headlines/descriptions/sitelinks/callouts/snippets)
6. Keyword intelligence engine (embeddings + clustering/inten��o)
7. Automated campaign builder (sync e async)
8. Analytics engine (overview + top entities + rollup job)
9. Affiliate tracking system (click/session/attribution/conversion)
10. Worker services (queues, retries, backoff, DLQ, status em DB)

## API v1

- `GET /health`
- `GET /v1/google/oauth/start`
- `GET /v1/google/oauth/callback`
- `GET /v1/google/ads/customers`
- `POST /v1/google/ads/accounts/select`
- `GET /v1/google/ads/metrics`
- `GET /v1/google/ads/extensions/suggest`
- `GET /v1/products`
- `POST /v1/products`
- `POST /v1/products/discover`
- `POST /v1/products/rank`
- `GET /v1/landing-pages`
- `GET /v1/landing-pages/:slug`
- `POST /v1/landing-pages/generate`
- `POST /v1/landing-pages/generate/async`
- `POST /v1/landing-pages/:landingPageId/publish`
- `GET /v1/campaigns`
- `POST /v1/campaigns/build`
- `POST /v1/campaigns/build/async`
- `POST /v1/campaigns/launch`
- `GET /v1/analytics`
- `POST /v1/analytics/rollup`
- `POST /v1/tracking/click`
- `POST /v1/tracking/conversion`
- `POST /v1/ai/ad-copy/generate`
- `POST /v1/ai/keywords/embeddings`
- `POST /v1/ai/landing/blocks`
- `POST /v1/jobs`
- `GET /v1/jobs/:jobId`

## Auth e seguran�a

- JWT Supabase (`SUPABASE_JWT_SECRET`) validado no Fastify
- Rate limit global por IP
- Tokens OAuth criptografados com AES-256-GCM (`ENCRYPTION_KEY`)
- Auditoria por request autenticada (`audit_logs`)

## Filas BullMQ

- `product_discovery`
- `product_scrape`
- `keyword_intel`
- `landing_generate`
- `campaign_build`
- `campaign_optimize`
- `analytics_rollup`
- `affiliate_reconcile`

## Setup local

1. Copie env:

```bash
cp .env.example .env
```

2. Infra local:

```bash
docker compose up -d
```

3. Instala��o:

```bash
corepack pnpm install
```

4. Typecheck:

```bash
corepack pnpm -r typecheck
```

5. Build dos servi�os:

```bash
corepack pnpm --filter @ads/db build
corepack pnpm --filter @ads/api build
corepack pnpm --filter @ads/worker build
corepack pnpm --filter @ads/web build
```

## Deploy Railway

- Service 1 (API):
  - Build: `corepack pnpm --filter @ads/api build`
  - Start: `corepack pnpm --filter @ads/api start`
- Service 2 (Worker):
  - Build: `corepack pnpm --filter @ads/worker build`
  - Start: `corepack pnpm --filter @ads/worker start`
- Service 3 (Web):
  - Build: `corepack pnpm --filter @ads/web build`
  - Start: `corepack pnpm --filter @ads/web start`
