# EPIC-01: Project Scaffold & App Shell

**Status:** Complete
**Dependencies:** None (first epic)

## Overview

Bootstrap a running Next.js application inside Docker with a navigable dashboard shell, Prisma ORM connected to PostgreSQL, and the foundational database tables (accounts, sources, categories). This epic produces the skeleton that every subsequent epic builds on — after completion, `docker compose up` serves a working app with sidebar navigation and empty pages.

## Deliverables

### Project Init (`app/` directory)
- `package.json` — Next.js 15, React 19, Tailwind CSS 4, Prisma, TypeScript
- `tsconfig.json` — strict mode, path aliases (`@/` → `app/`)
- `next.config.ts`
- `postcss.config.mjs`
- `.eslintrc.json`

### Docker
- `app/Dockerfile` — multi-stage build (deps → build → run), Node 22 Alpine
- `app/.dockerignore`

### Prisma
- `app/prisma/schema.prisma` — datasource, generator, enums (`AccountType`, `SourceType`), models: `Account`, `Source`, `Category`
- `app/lib/prisma.ts` — singleton client (global caching for dev hot-reload)

### Seed Data
- `app/prisma/seed.ts` — hierarchical category taxonomy:
  - **Top-level (~10):** Moradia, Alimentacao, Transporte, Saude, Educacao, Lazer, Servicos/Assinaturas, Vestuario, Financeiro, Renda
  - **Subcategories (~30):** e.g. Alimentacao → Supermercado, Restaurantes, Delivery, Padaria; Moradia → Aluguel, Condominio, Energia, Agua, Gas, Internet; etc.
- Seed script registered in `package.json` (`prisma.seed`)

### App Shell
- `app/app/layout.tsx` — root layout with html/body, font setup, global metadata
- `app/app/(dashboard)/layout.tsx` — sidebar + main content area
- `app/app/(dashboard)/page.tsx` — Overview placeholder
- `app/app/globals.css` — Tailwind directives, CSS variables for theming
- Sidebar component with navigation links to all future pages:
  - Overview (`/`)
  - Transactions (`/transactions`)
  - Budgets (`/budgets`)
  - Recurring (`/recurring`)
  - Installments (`/installments`)
  - Goals (`/goals`)
  - Sources (`/sources`)
  - Insights (`/insights`)
- Placeholder pages for each route (empty `page.tsx` with page title)

## Database Changes

### New Tables
| Table | Key Fields |
|-------|-----------|
| `accounts` | id (UUID), name, type (checking/credit/savings), created_at, updated_at |
| `sources` | id (UUID), name, type (email/csv/api/manual), identifier, account_id (FK → accounts), created_at, updated_at |
| `categories` | id (UUID), name, parent_id (self-ref FK, nullable), created_at |

### Enums
- `AccountType`: `CHECKING`, `CREDIT`, `SAVINGS`
- `SourceType`: `EMAIL`, `CSV`, `API`, `MANUAL`

## Open Decisions Resolved

- **J (Default category taxonomy):** Resolved. Seed script creates ~10 top-level categories with ~30 subcategories covering Brazilian personal finance. Taxonomy is in Portuguese.
- **I (Prisma schema):** Partially resolved. Foundation models defined; feature epics extend the schema incrementally.

## Acceptance Criteria

- [ ] `docker compose up` builds the app service and starts without errors
- [ ] `http://localhost:3000` renders the dashboard shell with sidebar navigation
- [ ] All sidebar links navigate to their placeholder pages without 404s
- [ ] `npx prisma db push` applies the schema to PostgreSQL successfully
- [ ] `npx prisma db seed` populates categories with hierarchical data
- [ ] `SELECT count(*) FROM categories WHERE parent_id IS NULL` returns ~10
- [ ] `SELECT count(*) FROM categories WHERE parent_id IS NOT NULL` returns ~30
- [ ] Prisma client imports work from `@/lib/prisma`

## Architecture Notes

- The `app/` directory is the Docker build context, matching the existing `docker-compose.yml` service definition (`build.context: ./app`).
- Tailwind CSS 4 with CSS-first configuration via `@theme` block in `globals.css` (no JS config file needed in v4).
- All models use UUID primary keys (`@default(uuid())`).
- The `Category` model uses a self-referential `parent_id` for hierarchy — no closure table or nested set; simple one-level depth is sufficient for personal finance.
- Timestamps: `created_at` and `updated_at` on mutable tables; `created_at` only on reference data (categories).
