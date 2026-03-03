# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grana AI is a single-user, self-hosted personal finance dashboard. It ingests bank statements from Gmail, parses them with Claude API, stores structured transactions in PostgreSQL, and surfaces data through Metabase dashboards embedded in a Next.js app.

**Architecture flow:**
```
Gmail → n8n (orchestration) → Claude API (parsing) → PostgreSQL → Metabase + Next.js
```

**Currency:** BRL only. No multi-currency support.

## Infrastructure

Four Docker Compose services:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL 17 | 5432 | Database (`finance` DB) |
| n8n | 5678 | Daily email polling, statement processing workflows |
| Metabase | 3001 | Read-only analytics/dashboards |
| Next.js app | 3000 | Write operations, forms, embedded Metabase charts |

```bash
# Start all services
docker compose up

# Environment setup: copy env.example to .env and fill values
```

## Tech Stack

- **Framework:** Next.js 15 (App Router, `app/app/` directory inside Docker context)
- **ORM:** Prisma 6 with `prisma-client` generator (schema in `app/prisma/schema.prisma`, output to `app/prisma/generated/client/`)
- **Database:** PostgreSQL 17
- **Styling:** Tailwind CSS 4 (CSS-first config, no `tailwind.config.ts`)
- **AI:** Anthropic Claude API for statement parsing and insights
- **Runtime:** Node 22 Alpine (Docker)

## Key Architecture Decisions

- **Two-layer UI:** Metabase handles read/visualization; Next.js handles write/interaction. Metabase charts are embedded in Next.js via signed iframes (`MetabaseEmbed` component).
- **Deduplication:** Two levels — statement hash in `processed_statements` prevents reprocessing; unique constraint on `(account_id, date, amount, description_raw)` with `ON CONFLICT DO NOTHING` catches transaction duplicates.
- **Budgets:** Template-based with monthly overrides. `period = null` is the default template; `period = YYYY-MM` overrides for that month. Falls back to latest template if no override exists.
- **Savings goals:** `current_amount` is computed (sum of linked transactions), not stored.
- **Transaction descriptions:** Always split into `description_raw` (verbatim from statement) and `description_clean` (AI-normalized, human-friendly).
- **Amount convention:** Negative = debit, positive = credit. Stored as NUMERIC.
- **Categories:** Hierarchical via `parent_id` self-reference.
- **Recurring detection:** Pattern match same merchant + similar amount across ≥2 months.

## Key Files

- **`SDD.md`** — Complete system design document. Read this first for full architecture, database schema, data flow, and open design decisions.
- **`docker-compose.yml`** — Service definitions and dependencies.
- **`env.example`** — Required environment variables.
- **`app/prisma/schema.prisma`** — Database schema (Account, Source, Category models).
- **`app/prisma/seed.ts`** — Idempotent category seed (45 categories: 10 parents + 35 children, Portuguese).
- **`app/lib/prisma.ts`** — PrismaClient singleton (globalThis pattern for dev hot-reload).
- **`app/components/Sidebar.tsx`** — Navigation sidebar with 8 sections.
- **`app/app/(dashboard)/layout.tsx`** — Dashboard layout wrapping all pages.

## Open Design Decisions

These items from SDD.md §5 are still unresolved:
- Staging table schema (temporary storage before promotion to `transactions`)
- Categorization rules engine (DB table vs config file)
- Historical data ingestion strategy (first-run backlog processing)

## Prisma Import Convention

With Prisma 6's `prisma-client` generator and custom output path, import from the `client.ts` file directly:
```typescript
import { PrismaClient } from "../prisma/generated/client/client";
```
In app code, use the singleton from `@/lib/prisma`:
```typescript
import { prisma } from "@/lib/prisma";
```
