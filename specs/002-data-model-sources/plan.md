# Implementation Plan: Data Model & Source Management

**Branch**: `002-data-model-sources` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-data-model-sources/spec.md`

## Summary

Extend the database with Transaction, StagingTransaction, and ProcessedStatement models (FR-012–FR-015), then build CRUD REST APIs for Accounts and Sources (FR-001–FR-011) with Zod validation and consistent response envelopes, backed by Vitest unit tests. Finally, implement a Sources management page (FR-016–FR-018) with inline account/source forms.

## Technical Context

**Language/Version**: TypeScript 5.x (Node 22 Alpine)
**Primary Dependencies**: Next.js 15, React 19, Prisma 6, Zod (new), Vitest (new, dev)
**Storage**: PostgreSQL 17 via Prisma ORM
**Testing**: Vitest (single-run mode: `npx vitest run`)
**Target Platform**: Docker (self-hosted, single `docker compose up`)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: <200ms client-side route transitions, <1s server-rendered pages
**Constraints**: Single user, BRL only, Docker Compose only, no authentication
**Scale/Scope**: ~10 accounts, ~10 sources, schema ready for ~100k transactions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Applies | How Satisfied | Status |
|---|-----------|---------|---------------|--------|
| I | Data Integrity | YES | `Decimal(12,2)` for amounts (never Float). `description_raw`/`description_clean` split. Categories via `parent_id`. Amount sign convention enforced at schema level. | PASS |
| II | Two-Layer UI | YES | Next.js handles all CRUD (write layer). Metabase untouched (read layer). No Metabase embeds in this epic. | PASS |
| III | AI-Assisted | PARTIAL | No AI usage this epic. StagingTransaction schema (`category_suggestion`, `confidence_score`, `status`) structures the future AI review workflow. | PASS |
| IV | Idempotent Processing | YES | `@@unique([account_id, date, amount, description_raw])` on Transaction enables `ON CONFLICT DO NOTHING`. `@unique` on `ProcessedStatement.statement_hash` prevents reprocessing. | PASS |
| V | Simplicity | YES | YAGNI: Transaction model has only core fields — `is_recurring`, `installment_group_id`, `saving_goal_id` etc. deferred to later epics. Single migration for all 3 new tables. Client-side state for UI (no SWR/React Query). | PASS |
| VI | Code Quality | YES | TypeScript strict mode (already enabled). Prisma import convention (`@/lib/prisma` singleton). Zod validation at API boundaries. Shared `api.ts` helper for consistent envelopes. No `any` types. | PASS |
| VII | Testing Discipline | YES | Vitest single-run mode (`npx vitest run`). Priority: DB constraints > API routes > Zod schemas > UI. Tests run against real finance_test database per research.md decision 7. Prisma is an internal module — not mocked (constitution VII). Behavioral test names. | PASS |
| VIII | UX Consistency | YES | Sources page in pt-BR. Three states: loading (skeleton), empty (helpful message), error (actionable message). Tailwind CSS utility classes only. Interactive feedback (disabled during submission, success/error indicators). | PASS |
| IX | Performance | YES | No N+1: Prisma `include` with `select` for source→account joins. Pagination deferred — see Constitution Tradeoffs section below (IX vs V). | PASS (with documented tradeoff) |

**Gate result**: ALL PASS. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-data-model-sources/
├── plan.md              # This file
├── research.md          # Phase 0 output — 9 decisions documented
├── data-model.md        # Phase 1 output — 6 entities, 1 new enum
├── quickstart.md        # Phase 1 output — setup & verification guide
├── contracts/
│   └── api.md           # Phase 1 output — 10 endpoints, response envelope
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── prisma/
│   └── schema.prisma             # Modified: add StagingStatus enum, Transaction,
│                                 #   StagingTransaction, ProcessedStatement models,
│                                 #   back-relations on Account/Source/Category
├── lib/
│   ├── prisma.ts                 # Existing: PrismaClient singleton (unchanged)
│   ├── api.ts                    # New: response envelope helpers (ok, created,
│   │                             #   badRequest, notFound, conflict)
│   └── schemas/
│       ├── account.ts            # New: Zod schemas (create, update)
│       └── source.ts             # New: Zod schemas (create, update)
├── app/
│   ├── api/
│   │   ├── accounts/
│   │   │   ├── route.ts          # New: GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts      # New: GET (single), PATCH (update), DELETE
│   │   └── sources/
│   │       ├── route.ts          # New: GET (list), POST (create)
│   │       └── [id]/
│   │           └── route.ts      # New: GET (single), PATCH (update), DELETE
│   └── (dashboard)/
│       └── sources/
│           └── page.tsx          # Modified: full Sources management page
├── components/
│   ├── AccountList.tsx           # New: account list with inline form
│   └── SourceList.tsx            # New: source list with creation form
├── vitest.config.ts              # New: Vitest configuration
└── test/
    └── setup.ts                  # New: test env setup (DATABASE_URL, mocks)
```

**Structure Decision**: Follows the existing Next.js App Router layout established in EPIC-01. API routes under `app/api/`, shared utilities under `lib/`, components under `components/`. Test files colocated with source files (`*.test.ts` next to `*.ts`).

## Constitution Tradeoffs

### Pagination deferred (Principle IX vs V)

Constitution IX requires pagination on list views including sources. Principle V (YAGNI) says features MUST NOT be built until there is a concrete need. At current scale (~10 accounts, ~10 sources for a single user), pagination adds complexity with zero benefit.

**Resolution**: Defer pagination to the epic that introduces transaction list views (EPIC-03+), where record counts will justify it. Revisit if source/account counts exceed 50.

## Complexity Tracking

No constitution violations — this section is intentionally empty.
