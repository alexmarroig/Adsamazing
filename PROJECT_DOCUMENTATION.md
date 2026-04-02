# Adsamazing

## Overview
Adsamazing is a monorepo SaaS platform designed to automate one of the hardest parts of affiliate marketing: turning a product opportunity into a runnable acquisition machine. Instead of treating product research, ad creation, landing-page production, tracking, and optimization as separate tools, the platform connects them into a single workflow with shared data, background jobs, and AI-assisted content generation.

At a practical level, the system lets a user connect a Google Ads account, discover and rank affiliate products, generate conversion-oriented landing pages and ad assets, launch campaigns, and track downstream clicks and conversions. The real value is not any single feature in isolation; it is the orchestration layer that makes the pipeline composable and automatable.

## Problem
Affiliate acquisition is usually fragmented across spreadsheets, ad managers, landing-page builders, affiliate dashboards, and manual reporting. That fragmentation creates three problems:

1. High operational overhead: teams spend more time stitching tools together than testing offers.
2. Slow iteration: research, asset creation, launch, and analysis happen in disconnected steps.
3. Weak feedback loops: clicks, conversions, and campaign decisions often live in different systems, making optimization reactive and imprecise.

This matters because paid acquisition only works when teams can move quickly, test many offers, and close the loop between media spend and conversion outcomes.

## Solution
Adsamazing solves this by acting as an automation layer between product discovery, campaign creation, AI generation, and attribution.

The backend stores the full operating context for each user: connected Google accounts, ad accounts, products, campaigns, landing pages, keywords, jobs, clicks, and conversions. The API exposes both synchronous actions and queue-backed workflows. The worker handles long-running or repeatable tasks such as product discovery, landing generation, campaign creation, keyword intelligence, analytics rollups, and reconciliation.

AI is used where speed and structured output matter most: generating ad copy, generating landing-page content blocks, and producing embeddings for semantic keyword analysis. Those outputs are not treated as loose text; they are turned into JSON structures that the rest of the system can persist, render, and act on.

## Features
- Google Ads OAuth connection, accessible-customer discovery, account selection, and account-level metrics retrieval
- Affiliate product ingestion with weighted ranking based on commission, demand, CPC, competition, and conversion signal
- AI-generated ad copy with structured outputs for headlines, descriptions, sitelinks, callouts, and snippets
- AI-generated landing pages stored as JSON blocks and rendered into public pages through Next.js
- One-click campaign assembly that creates campaigns, ad groups, keywords, ads, and extensions from product context
- Async job orchestration with BullMQ, retries, backoff, dead-letter capture, status persistence, and manual job triggering
- Click and conversion tracking tied to attribution sessions so campaign outcomes can feed back into optimization
- Scheduled worker jobs for recurring analytics rollups and affiliate reconciliation

## Technical Architecture
- Frontend: Next.js app-router dashboard for operators, with Supabase-based authentication and dedicated flows for Google Ads, products, campaigns, analytics, jobs, keyword intelligence, and landing-page generation.
- Backend: Fastify API with Zod validation, JWT-based auth, rate limiting, audit logging, and route-level separation for OAuth, ads, products, landing pages, campaigns, analytics, AI, tracking, and job control.
- APIs: Google OAuth and Google Ads APIs for account connection and performance retrieval; internal REST endpoints expose the automation workflow to the web client.
- AI Components: OpenAI Responses API is used for structured ad-copy and landing-block generation, while embeddings power semantic keyword processing and clustering logic.
- Database: PostgreSQL via Prisma stores a multi-tenant marketing data model covering users, Google accounts, ad accounts, products, campaigns, ads, keywords, landing pages, tracking sessions, conversions, jobs, dead letters, and audit logs.

## AI / Smart Components (if applicable)
- LLM usage: The platform uses LLMs for two production-style generation tasks: ad-copy generation and landing-page generation. Both are driven by role-specific prompts and are expected to return structured JSON rather than freeform prose, which makes the outputs renderable and reusable downstream.
- RAG: This is not a full retrieval-augmented generation system yet. The current semantic layer is embedding-based keyword intelligence, which creates vector representations that can support clustering, intent analysis, and future retrieval workflows.
- Automation: AI outputs are embedded inside broader automations. Product discovery can feed campaign creation, campaign creation can feed tracking, and worker jobs can run these processes asynchronously with retries and scheduling.
- Decision logic: The system includes explicit non-LLM decision rules for product scoring, keyword intent grouping, and conservative campaign budget adjustment. That is important because it shows the product is not relying on AI alone; it combines deterministic heuristics with generative assistance.

## My Role
I designed and implemented the platform as an end-to-end product system rather than a collection of isolated scripts. That included:

- defining the monorepo architecture across web, API, worker, and shared packages
- modeling the multi-tenant marketing domain in Prisma, including attribution, job state, and auditability
- building the Fastify API surface and validation contracts
- implementing BullMQ-based orchestration for background automation and scheduled jobs
- integrating Google OAuth and Google Ads account discovery with encrypted credential storage
- designing the AI layer so copy and landing pages are generated as structured outputs that the UI can render directly
- building the operator dashboard in Next.js for campaign operations, job control, analytics, and public landing delivery

## Challenges
The hard part of this project is not the UI. It is the coordination problem.

One challenge is maintaining a coherent data model across many moving parts: user identity, Google credentials, ad accounts, products, campaigns, landing pages, sessions, conversions, and asynchronous jobs all need to stay linked correctly.

Another challenge is turning LLM output into something operationally safe. Freeform text is easy to generate, but much harder to persist and render reliably. Using structured outputs for ad assets and landing blocks makes the AI layer more usable inside a real application.

A third challenge is reliability. Long-running automation cannot block the request cycle, so the system uses queues, retries, backoff, dead-letter handling, and persisted job state. That is what moves the project from demo territory toward production-oriented architecture.

## Impact
- Automation: The platform compresses a traditionally manual workflow into a single pipeline, reducing the effort required to go from product idea to campaign-ready assets.
- Operational speed: Product discovery, landing generation, keyword processing, and campaign building can run asynchronously, which keeps the UI responsive and makes batch-style execution possible.
- Reliability: Idempotent job records, queue retries, and dead-letter persistence create a safer foundation for automation than one-off scripts or cron-only approaches.
- Business value: By connecting discovery, creative generation, launch, attribution, and optimization, the product creates the basis for closed-loop paid acquisition rather than disconnected marketing tasks.
- Strategic value: The system is structured to support future auto-optimization because the data model already captures both top-of-funnel actions and downstream conversion outcomes.

## Differentiation
This project is not a thin wrapper around the OpenAI API or a basic CRUD admin panel.

Its differentiator is workflow depth. It spans offer selection, ad-account connectivity, AI-assisted creative generation, landing-page rendering, asynchronous operations, attribution tracking, and optimization signals inside one consistent architecture.

It is also technically stronger than a typical portfolio SaaS because it handles multi-service concerns that usually appear in real products: OAuth token lifecycle, encrypted secret storage, queue orchestration, job deduplication, scheduled processing, audit logs, and public/private application surfaces.

Just as importantly, the AI usage is productized. The models are used to generate structured assets that feed downstream systems, not just to produce chatbot-style text.

## Future Improvements (optional)
- Replace placeholder affiliate connectors with production integrations for major affiliate networks and richer product signals
- Evolve keyword embeddings into a stronger semantic decision layer with real clustering persistence and retrieval-assisted recommendations
- Complete direct Google Ads mutation and publish flows so campaigns can be pushed from draft to live without manual handoff
- Add stronger analytics attribution models, cohort reporting, and ROI calculations tied to real media cost data
- Introduce approval workflows, human-in-the-loop review, and experiment tracking for safer automated campaign changes
