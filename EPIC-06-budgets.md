# EPIC-06: Budget Management

**Status:** Not Started
**Dependencies:** EPIC-01, EPIC-05

## Overview

Implement template-based budgets with monthly overrides and a visual budget-vs-actual comparison. Users set default budgets per category (the "template"), then optionally override specific months. The system computes actual spend from categorized transactions and displays color-coded comparisons.

## Deliverables

### Prisma Migration
- Add `Budget` model to `schema.prisma`
- Run migration

### Budget CRUD API
- `app/app/api/budgets/route.ts`:
  - `GET` — list budgets with template/override resolution for a given period
  - `POST` — create budget (template if no period, override if period specified)
- `app/app/api/budgets/[id]/route.ts`:
  - `PUT` — update budget amount
  - `DELETE` — delete budget entry

### Budget Resolution Logic
- `app/lib/budgets.ts`:
  - `getBudgetsForPeriod(period: string): Promise<ResolvedBudget[]>` — for each category:
    1. Look for override with matching `period` (YYYY-MM)
    2. If none, fall back to template (latest entry with `period = null`)
    3. Return resolved budget amount per category
  - `getBudgetVsActual(period: string): Promise<BudgetComparison[]>` — joins resolved budgets with actual spend (aggregated from `transactions` by `category_id` for the given month)

### UI
- `app/app/(dashboard)/budgets/page.tsx` — Budget management page:
  - Period selector (month/year picker, defaults to current month)
  - Budget comparison list: each category row shows:
    - Category name (with parent if subcategory)
    - Budget amount
    - Actual spend (sum of transactions)
    - Remaining / over-budget amount
    - Progress bar (color-coded: green <80%, yellow 80–100%, red >100%)
  - "Set Template" mode: edit default budgets per category
  - "Override Month" mode: set overrides for specific months
- `app/app/components/forms/BudgetForm.tsx` — form for setting/editing a budget entry:
  - Category selector (dropdown with hierarchy)
  - Amount input (BRL)
  - Toggle: template vs monthly override
  - Period picker (shown only for overrides)

## Database Changes

### New Tables
| Table | Key Fields |
|-------|-----------|
| `budgets` | id (UUID), category_id (FK → categories), amount (Decimal), period (text, nullable — null = template, "YYYY-MM" = override), created_at, updated_at |

### Constraints
- Unique constraint on `(category_id, period)` — one budget entry per category per period (including one null-period template per category)

## Acceptance Criteria

- [ ] `POST /api/budgets` with `period: null` creates a template budget for a category
- [ ] `POST /api/budgets` with `period: "2026-03"` creates a monthly override
- [ ] Duplicate `(category_id, period)` returns 409 Conflict
- [ ] `GET /api/budgets?period=2026-03` returns resolved budgets (overrides + template fallbacks)
- [ ] Budget vs actual computation aggregates transaction amounts by category for the given month
- [ ] Budget page renders all categories with budget/actual/remaining bars
- [ ] Progress bars are green (<80%), yellow (80–100%), red (>100%)
- [ ] Template mode allows setting defaults for all categories
- [ ] Override mode allows adjusting specific months without changing the template
- [ ] Categories without a budget entry (template or override) are shown as "No budget set"

## Architecture Notes

- Budget resolution is computed at query time, not stored. The `getBudgetsForPeriod` function performs the template/override fallback logic on each request.
- "Actual spend" is computed via SQL aggregation: `SUM(amount) FROM transactions WHERE category_id = ? AND date >= ? AND date < ?`. Only negative amounts (debits) count toward spend.
- The unique constraint on `(category_id, period)` uses Prisma's `@@unique([categoryId, period])`. NULL periods are treated as distinct by PostgreSQL's unique constraint behavior.
- Budget amounts are always positive (they represent spending limits). Actual spend is the absolute value of negative transaction amounts.
