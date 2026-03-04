# EPIC-12 Dashboard Build — Design Document

**Date:** 2026-03-04
**Status:** Approved
**Source spec:** `EPIC-12-dashboard.md`

## Execution Strategy

13 issues across 3 phases, built sequentially with one branch/PR per issue.

**Build order:**
1. `12.1` — Schema extension (4 enums, 4 models, 5 Transaction fields)
2. `12.1.5` — shadcn/ui init + 18 components + DataTable + CategorySelect
3. `12.2` — Categories CRUD (template-setting slice)
4. `12.3` — Transactions List (read-only, filters/sort/pagination)
5. `12.4` — Transaction Review (staging promote flow)
6. `12.5` — Budgets (template/override logic)
7. `12.6` — Recurring (subscriptions/bills)
8. `12.7` — Installments (progress tracking)
9. `12.8` — Savings Goals (computed current_amount)
10. `12.9` — MetabaseEmbed + JWT signing
11. `12.10` — Overview dashboard page
12. `12.11` — Trends page

**Per-issue workflow:** Branch from main → implement → tests pass → PR → merge → next.

**12.2 (Categories) is the template-setter** — establishes patterns for Zod schemas, API routes, Dialog forms, toast notifications, and E2E tests.

## Phase 1 — Foundation

### 12.1: Schema Extension

- 4 enums: `RecurringFrequency`, `RecurringType`, `InstallmentFrequency`, `BudgetStatus`
- 4 models: `Budget`, `RecurringItem`, `InstallmentGroup`, `SavingGoal`
- 5 new Transaction fields: `is_recurring`, `recurring_item_id`, `installment_group_id`, `is_savings_transfer`, `saving_goal_id`
- Budget `(category_id, period)` unique constraint + partial index for `WHERE period IS NULL`
- All FKs use `onDelete: SetNull`
- Partial index requires custom SQL in migration file (Prisma can't auto-generate it)

### 12.1.5: shadcn/ui Setup

- `npx shadcn@latest init` (new-york, neutral, Tailwind v4 mode)
- 18 shadcn components → `components/ui/`
- `@tanstack/react-table` dependency
- `DataTable.tsx` — generic TanStack wrapper (sort, pagination, empty state, optional row selection)
- `CategorySelect.tsx` — Popover + Command combobox, fetches `/api/categories`, hierarchical labels
- E2E tests for both composite components

**Risk:** shadcn Tailwind v4 CSS coexistence with existing `@theme` block — may need manual globals.css adjustment.

## Phase 2 — Vertical Slices

### Common Pattern

Each slice follows the same structure:
- `lib/schemas/<entity>.ts` — Zod create/update schemas
- `app/api/<entity>/route.ts` — GET (paginated, 50/page default) + POST
- `app/api/<entity>/[id]/route.ts` — GET + PATCH + DELETE
- `app/(dashboard)/<entity>/page.tsx` — List UI with DataTable
- `app/(dashboard)/<entity>/loading.tsx` — Skeleton
- `components/forms/<Entity>Form.tsx` — Dialog modal
- Unit tests (schemas + routes) + E2E test (CRUD lifecycle)

### Shared Conventions

- Response envelope: `{ data, error }` via `lib/api.ts` helpers
- Sonner toasts: green success (3s auto-dismiss), red error (persistent)
- `loading.tsx` + `error.tsx` per route
- Sidebar wiring verified per issue

### Slice-Specific Notes

| Issue | Key Detail |
|-------|-----------|
| 12.2 Categories | Hierarchical tree, delete protection (409 if referenced) |
| 12.3 Transactions | Read-only, inline filter bar (search, account, category, date range) |
| 12.4 Review | Row selection, bulk approve/reject, category override, ON CONFLICT DO NOTHING |
| 12.5 Budgets | Template/override logic, GET /summary with fallback, Progress bars |
| 12.6 Recurring | Badge for frequency/type, annual total computed |
| 12.7 Installments | installments_paid from COUNT, progress bars |
| 12.8 Goals | current_amount from SUM, projected completion from 3-month average |

## Phase 3 — Metabase Integration

### 12.9: MetabaseEmbed + JWT

- `jsonwebtoken` + `@types/jsonwebtoken`
- `lib/metabase.ts` — JWT signing with `METABASE_SECRET_KEY`
- `POST /api/metabase` — returns signed embed URL
- `MetabaseEmbed.tsx` — client component, responsive iframe
- Graceful fallback when Metabase unavailable
- Unit tests only (no E2E)

### 12.10: Overview Dashboard

- Replace placeholder `/` page with 4 widget cards
- 3 Metabase embeds + 1 API widget (recent transactions)

### 12.11: Trends Page

- New `/trends` route + "Tendências" sidebar entry
- 3 Metabase embeds (spend MoM, income stability, expense trends)
- No E2E tests (Metabase dependency)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Execution mode | Sequential | Easier review, pattern consistency, early course correction |
| Git workflow | One branch per issue | Clean history, matches issue numbering |
| Phase 2 order | Spec order (12.2→12.8) | Logical progression, Categories first as template |
| Approach | Validate spec as-is | Spec is comprehensive, no areas need rethinking |
