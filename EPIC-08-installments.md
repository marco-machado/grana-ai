# EPIC-08: Installment Tracking

**Status:** Not Started
**Dependencies:** EPIC-01, EPIC-04

## Overview

Implement installment group management (parcelamento) — a core feature for Brazilian credit card usage. Users create installment groups representing multi-payment purchases, link transactions to them, and track progress (paid vs total installments, remaining balance, projected end date).

## Deliverables

### Prisma Migration
- Add `InstallmentGroup` model to `schema.prisma`
- Add `installment_group_id` (UUID, nullable FK) column to `Transaction` model
- Run migration

### Installment Group CRUD API
- `app/app/api/installments/route.ts`:
  - `GET` — list installment groups with computed progress (installments_paid from linked transactions count)
  - `POST` — create installment group
- `app/app/api/installments/[id]/route.ts`:
  - `GET` — single group with linked transactions
  - `PUT` — update group details
  - `DELETE` — delete group (unlinks transactions)

### Transaction Linking
- `app/app/api/installments/[id]/link/route.ts`:
  - `POST` — link transactions to an installment group (`{ transaction_ids: [...] }`)
  - `DELETE` — unlink transactions from the group

### Progress Computation
- `app/lib/installments.ts`:
  - `computeProgress(group: InstallmentGroup): InstallmentProgress` — returns:
    - `installments_paid`: count of linked transactions
    - `installments_remaining`: `installments_total - installments_paid`
    - `amount_paid`: sum of linked transaction amounts (absolute value)
    - `amount_remaining`: `total_amount - amount_paid`
    - `projected_end_date`: `start_date + (installments_total * frequency_months)`
    - `is_complete`: `installments_paid >= installments_total`

### Best-Effort Reconstruction
- `app/lib/installment-matcher.ts`:
  - `findInstallmentCandidates(groupId: string): Promise<Transaction[]>` — searches for unlinked transactions matching the group's description pattern and approximate per-installment amount
  - Used from the UI to suggest transactions that might belong to an existing group

### UI
- `app/app/(dashboard)/installments/page.tsx` — Installments management page:
  - List of active installment groups with:
    - Description, total amount
    - Progress bar (installments_paid / installments_total)
    - Amount remaining
    - Projected end date
    - Expand to see linked transactions
  - Completed groups section (collapsed)
  - "New Group" button opens InstallmentForm
- `app/app/components/forms/InstallmentForm.tsx` — form for creating/editing groups:
  - Description, total amount, total installments, start date
  - After creation: transaction linking section with search + suggestion

## Database Changes

### New Tables
| Table | Key Fields |
|-------|-----------|
| `installment_groups` | id (UUID), description, total_amount (Decimal), installments_total (Int), start_date (Date), created_at, updated_at |

### Modified Tables
| Table | Changes |
|-------|---------|
| `transactions` | Add `installment_group_id` (UUID, nullable FK → installment_groups) |

### Removed from SDD Schema
- `installments_paid` is NOT stored on `installment_groups` — it's computed from `COUNT(transactions WHERE installment_group_id = ?)`. This avoids sync issues.

## Acceptance Criteria

- [ ] `POST /api/installments` creates an installment group
- [ ] `GET /api/installments` returns groups with computed progress (paid count, remaining amount)
- [ ] `POST /api/installments/:id/link` links transactions to a group
- [ ] Linking a transaction sets its `installment_group_id`
- [ ] Progress computation: `installments_paid = COUNT(linked transactions)`
- [ ] `amount_remaining = total_amount - SUM(ABS(linked transaction amounts))`
- [ ] Installments page shows active groups with progress bars
- [ ] Completed groups (paid ≥ total) are shown in a separate collapsed section
- [ ] InstallmentForm creates a new group with required fields
- [ ] `findInstallmentCandidates` suggests matching unlinked transactions
- [ ] Deleting a group unlinks all transactions (`installment_group_id = null`)

## Architecture Notes

- **Deviation from SDD:** `installments_paid` is computed (not stored) to match the savings goals pattern and avoid stale data. The SDD lists it as a stored field, but computing it is more reliable.
- Per-installment amount is approximately `total_amount / installments_total`, but real installment amounts can vary slightly due to interest or rounding. The matcher uses ±15% tolerance.
- Transaction linking is manual (user selects transactions to link) with AI-assisted suggestions. Full automation would require reliable installment detection from statement descriptions, which varies significantly across banks.
- A single transaction can only belong to one installment group (FK constraint). If a user tries to link a transaction already linked elsewhere, the API returns a 409 Conflict.
