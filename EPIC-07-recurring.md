# EPIC-07: Recurring Transaction Detection

**Status:** Not Started
**Dependencies:** EPIC-01, EPIC-04

## Overview

Automatically detect subscriptions and recurring bills by matching transaction patterns across months. Detected items are surfaced as candidates for user confirmation. Confirmed recurring items track next payment dates and annual cost projections.

## Deliverables

### Prisma Migration
- Add `RecurringItem` model to `schema.prisma`
- Add `is_recurring` (Boolean, default false) and `recurring_item_id` (UUID, nullable FK) columns to `Transaction` model
- Run migration

### Detection Algorithm
- `app/lib/recurring-detection.ts`:
  - `detectRecurringPatterns(accountId?: string): Promise<RecurringCandidate[]>`
  - Groups transactions by normalized `description_clean`
  - Filters groups where: same description appears in ≥2 distinct months AND amounts are within ±10% of each other
  - Returns candidates with: description, average amount, frequency (monthly/weekly/yearly), matched transaction IDs
  - Excludes transactions already linked to a confirmed recurring item

### Recurring Items CRUD API
- `app/app/api/recurring/route.ts`:
  - `GET` — list all recurring items (confirmed + unconfirmed candidates)
  - `POST` — create a recurring item manually
- `app/app/api/recurring/[id]/route.ts`:
  - `PUT` — update (confirm candidate, edit details)
  - `DELETE` — delete recurring item (unlinks transactions)
- `app/app/api/recurring/detect/route.ts`:
  - `POST` — trigger detection algorithm, return candidates

### Transaction Linking
- When a recurring item is confirmed, its matched transactions get `is_recurring = true` and `recurring_item_id` set
- New transactions matching a confirmed recurring item are auto-linked during the processing pipeline

### UI
- `app/app/(dashboard)/recurring/page.tsx` — Recurring management page:
  - **Confirmed section:** list of confirmed recurring items with:
    - Name, amount, frequency
    - Next payment date
    - Annual total projection
    - Edit/delete actions
  - **Candidates section:** unconfirmed items detected by algorithm:
    - Description, average amount, occurrence count
    - Approve (→ creates confirmed recurring item) / Dismiss buttons
  - "Run Detection" button to trigger fresh analysis
- `app/app/components/forms/RecurringForm.tsx` — form for creating/editing recurring items:
  - Name, expected amount, frequency (monthly/weekly/yearly), next payment date, type (subscription/bill/installment)

## Database Changes

### New Tables
| Table | Key Fields |
|-------|-----------|
| `recurring_items` | id (UUID), name, amount (Decimal), frequency (enum: MONTHLY/WEEKLY/YEARLY), next_date (Date), type (enum: SUBSCRIPTION/BILL/INSTALLMENT), status (enum: CONFIRMED/CANDIDATE), created_at, updated_at |

### Modified Tables
| Table | Changes |
|-------|---------|
| `transactions` | Add `is_recurring` (Boolean, default false), `recurring_item_id` (UUID, nullable FK → recurring_items) |

### New Enums
- `Frequency`: `MONTHLY`, `WEEKLY`, `YEARLY`
- `RecurringType`: `SUBSCRIPTION`, `BILL`, `INSTALLMENT`
- `RecurringStatus`: `CONFIRMED`, `CANDIDATE`

## Acceptance Criteria

- [ ] Detection algorithm finds transactions with same description appearing in ≥2 months with similar amounts (±10%)
- [ ] `POST /api/recurring/detect` returns candidate recurring items
- [ ] Confirming a candidate links matched transactions (`is_recurring = true`, `recurring_item_id` set)
- [ ] `GET /api/recurring` returns both confirmed items and unconfirmed candidates
- [ ] Recurring page shows confirmed items with next date and annual projection
- [ ] Recurring page shows candidates with approve/dismiss actions
- [ ] Dismissing a candidate removes it from the list without creating a recurring item
- [ ] Manual creation via RecurringForm works for items not auto-detected
- [ ] `next_date` computation: adds frequency interval (1 month/week/year) to last occurrence date
- [ ] Annual projection: `amount * (frequency == MONTHLY ? 12 : frequency == WEEKLY ? 52 : 1)`
- [ ] Deleting a recurring item unlinks all associated transactions (`is_recurring = false`, `recurring_item_id = null`)

## Architecture Notes

- Detection is on-demand (triggered by user or after processing), not continuous. This avoids running expensive queries on every transaction insert.
- The ±10% amount tolerance handles minor price variations (e.g. streaming service price changes). The tolerance is configurable in the detection function.
- `description_clean` (Claude-normalized) is used for matching, not `description_raw`, because raw descriptions vary across statement formats.
- `RecurringStatus` allows candidates to exist in the database without being confirmed. Dismissed candidates are deleted, not kept.
- Next payment date is initially computed from the last matched transaction + frequency interval. Users can manually adjust it.
