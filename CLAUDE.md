# CLAUDE.md

## Project Overview

Grana AI is a single-user personal finance tracker. AI agents parse bank statements and insert structured data into Supabase. Two dashboard surfaces display the data: a React app and self-hosted Metabase.

**Architecture:**
```
Bank statements → AI agents (Claude Code skill, Cowork, future) → Supabase PostgreSQL
                                                                       ↓
                                                            React Dashboard + Metabase
```

**Currency:** BRL only.
**Language:** All UI strings in pt-BR. Developer-facing logs in English.

## Tech Stack

- **Frontend:** Vite + React (static SPA served via nginx in Docker)
- **Database:** Supabase (hosted PostgreSQL) — accessed via Supabase JS client from browser
- **BI:** Self-hosted Metabase (Docker), connects to Supabase Postgres directly
- **AI parsing:** Claude Code skill (already built), Claude Cowork agent

## Infrastructure

Two Docker Compose services + external Supabase:

| Service | Port | Purpose |
|---------|------|---------|
| React app (nginx) | 3000 | Dashboard SPA |
| Metabase | 3001 | BI dashboards |
| Supabase (external) | — | PostgreSQL, REST API, auth |

```bash
docker compose up
```

## Database Schema

Three tables in Supabase, two enums. Migrations in `supabase/migrations/`.

**Enums:** `account_type` (checking, savings, credit_card, investment), `transaction_status` (pending, approved, rejected)

**Tables:**
- `account` — Bank accounts/cards. Fields: id, name, type, created_at, updated_at
- `category` — 14 pre-seeded categories in Portuguese. Fields: id, name, created_at
- `transaction` — Parsed statement lines. Fields: id, date, description_raw, description_clean, amount, account_id, category_id, status, statement_hash, created_at, updated_at

**Amount convention:** Negative = expense, positive = income.

**Deduplication:** Two partial unique indexes:
- With hash: `(account_id, statement_hash)` where hash is not null
- Without hash: `(account_id, date, amount, description_raw)` where hash is null

## Key Files

- **`GRANA-AI-SPEC.md`** — Full product spec. Read for context on scope and goals.
- **`supabase/migrations/`** — SQL migrations (already applied to Supabase).
- **`docker-compose.yml`** — Service definitions.

## Dashboard Views (React)

1. **Visão mensal** — Income vs expenses, net balance, month-over-month trend
2. **Gastos por categoria** — Spending by category (pie/bar chart)
3. **Transações** — Filterable/searchable transaction table
4. **Contas** — Balance summary per account

## Scope Boundaries

**In scope:** React dashboard (4 views), Metabase dashboards, docker-compose setup
**Out of scope:** Auth, budgets, bank APIs, mobile, recurring detection, investments

## Git Workflow

- **PR merge strategy**: Use merge commits (`--merge`), not squash.
- **Previous version**: Tagged as `v1-archive` (self-hosted Postgres/Prisma/Next.js architecture).
