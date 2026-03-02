# EPIC-09: Savings Goals

**Status:** Not Started
**Dependencies:** EPIC-01, EPIC-04

## Overview

Implement savings goals with progress tracking via computed amounts. Users create goals with target amounts and optional deadlines, flag transactions as savings transfers, and link them to specific goals. Current amounts are always computed (never stored), and projected completion dates are calculated from average monthly savings rates.

## Deliverables

### Prisma Migration
- Add `SavingGoal` model to `schema.prisma`
- Add `is_savings_transfer` (Boolean, default false) and `saving_goal_id` (UUID, nullable FK) columns to `Transaction` model
- Run migration

### Savings Goal CRUD API
- `app/app/api/goals/route.ts`:
  - `GET` — list goals with computed `current_amount` (SUM of linked transactions), progress percentage, projected completion date
  - `POST` — create goal
- `app/app/api/goals/[id]/route.ts`:
  - `GET` — single goal with linked transactions and projections
  - `PUT` — update goal details
  - `DELETE` — delete goal (unlinks transactions)

### Transaction Linking
- `app/app/api/goals/[id]/link/route.ts`:
  - `POST` — link transactions to a goal (`{ transaction_ids: [...] }`) — sets `is_savings_transfer = true` and `saving_goal_id`
  - `DELETE` — unlink transactions

### Projection Service
- `app/lib/savings-projection.ts`:
  - `computeGoalProgress(goalId: string): Promise<GoalProgress>` — returns:
    - `current_amount`: `SUM(amount) FROM transactions WHERE saving_goal_id = ?` (positive amounts = deposits)
    - `progress_percentage`: `current_amount / target_amount * 100`
    - `monthly_average`: average monthly savings rate (from linked transactions grouped by month)
    - `projected_completion`: if monthly_average > 0, `current_date + ((target_amount - current_amount) / monthly_average) months`
    - `on_track`: whether projected completion is before deadline (if deadline set)
    - `months_remaining`: `(target_amount - current_amount) / monthly_average`

### UI
- `app/app/(dashboard)/goals/page.tsx` — Goals management page:
  - List of active goals with:
    - Name, target amount (BRL)
    - Progress bar with current_amount / target_amount
    - Monthly average savings rate
    - Projected completion date (or "No deadline" if none set)
    - On-track indicator (green check / red warning if behind schedule)
    - Deadline countdown (if set)
  - Completed goals section (current_amount ≥ target_amount)
  - "New Goal" button opens GoalForm
- `app/app/components/forms/GoalForm.tsx` — form for creating/editing goals:
  - Name, target amount, deadline (optional date picker), linked account (optional)
  - After creation: transaction linking section

## Database Changes

### New Tables
| Table | Key Fields |
|-------|-----------|
| `saving_goals` | id (UUID), name, target_amount (Decimal), deadline (Date, nullable), linked_account_id (UUID, nullable FK → accounts), created_at, updated_at |

### Modified Tables
| Table | Changes |
|-------|---------|
| `transactions` | Add `is_savings_transfer` (Boolean, default false), `saving_goal_id` (UUID, nullable FK → saving_goals) |

## Acceptance Criteria

- [ ] `POST /api/goals` creates a savings goal with target amount
- [ ] `GET /api/goals` returns goals with computed `current_amount` (never stored)
- [ ] `current_amount` is calculated as `SUM(amount) FROM transactions WHERE saving_goal_id = ?`
- [ ] Linking transactions sets `is_savings_transfer = true` and `saving_goal_id`
- [ ] Progress percentage: `current_amount / target_amount * 100`, capped at 100
- [ ] Projected completion date calculated from average monthly savings rate
- [ ] Goals with no linked transactions show 0% progress and no projection
- [ ] Goals page shows progress bars, projections, and on-track indicators
- [ ] Completed goals (current ≥ target) shown in separate section
- [ ] GoalForm validates target_amount > 0
- [ ] Deleting a goal unlinks transactions (`saving_goal_id = null`, `is_savings_transfer = false`)
- [ ] Deadline countdown shows days/months remaining

## Architecture Notes

- `current_amount` is NEVER stored — it's computed on every query. This is a core architecture decision (SDD §3.3). The computation is `SUM(transactions.amount) WHERE saving_goal_id = goal.id`. For performance, this is done via Prisma's `_sum` aggregation.
- Savings transfers are typically positive amounts (money moving into savings). The amount convention (negative = debit) still applies — a "debit" from checking that's a savings transfer appears as negative in checking, but the linked savings goal counts it as positive progress.
- `linked_account_id` is optional — it associates a goal with a specific savings account but doesn't affect the computation. It's informational for the UI.
- A transaction can only be linked to one savings goal (FK constraint), same pattern as installments.
