# EPIC-04: Transaction Review & Approval

**Status:** Not Started
**Dependencies:** EPIC-03

## Overview

Build the human review loop for staged transactions. Users see parsed transactions pending review, can edit details (description, category, amount), approve or reject them individually or in bulk, and approved transactions get promoted to the main `transactions` table with dedup protection.

## Deliverables

### Staged Transactions API
- `app/app/api/transactions/staged/route.ts`:
  - `GET` — list staged transactions with filters (status, account_id, date range, search)
  - `PATCH` — bulk update: promote (approve) or reject selected transactions
- `app/app/api/transactions/staged/[id]/route.ts`:
  - `PUT` — edit a single staged transaction (description_clean, category_id, amount, date)
  - `DELETE` — reject/remove a single staged transaction

### Promotion Logic
- `app/lib/promotion.ts`:
  - `promoteTransactions(ids: string[]): Promise<PromotionResult>` — inserts approved staged transactions into `transactions` using `INSERT ... ON CONFLICT (account_id, date, amount, description_raw) DO NOTHING`
  - Returns count of promoted vs skipped (dedup conflicts)
  - Updates staged transaction status to `APPROVED` for promoted rows
  - Wraps in a database transaction for atomicity

### Transaction List API
- `app/app/api/transactions/route.ts`:
  - `GET` — list approved transactions with filters (account_id, category_id, date range, search, sort)
  - Pagination (cursor-based or offset)
- `app/app/api/transactions/[id]/route.ts`:
  - `GET` — single transaction with relations

### UI Components
- `app/app/components/TransactionReviewTable.tsx`:
  - Sortable columns (date, description, amount, category, confidence)
  - Row selection (individual checkboxes + select all)
  - Inline editing (click to edit description_clean, category dropdown, amount)
  - Color-coded confidence indicator (green ≥0.9, yellow 0.7–0.9, red <0.7)
  - Bulk action bar: Approve Selected, Reject Selected
  - Shows category_suggestion from Claude with confidence score

### Pages
- `app/app/(dashboard)/transactions/review/page.tsx` — Review staged transactions:
  - Filter bar (account, date range, status)
  - `TransactionReviewTable` component
  - Summary stats (total pending, total amount)
- `app/app/(dashboard)/transactions/page.tsx` — Approved transaction list:
  - Filterable, sortable table of promoted transactions
  - Search by description
  - Filter by account, category, date range

## Database Changes

No new tables or columns — uses existing `staging_transactions` and `transactions` from EPIC-02.

## Acceptance Criteria

- [ ] `GET /api/transactions/staged` returns pending staged transactions
- [ ] `GET /api/transactions/staged?status=PENDING&account_id=xxx` filters correctly
- [ ] `PUT /api/transactions/staged/:id` updates a staged transaction's editable fields
- [ ] `PATCH /api/transactions/staged` with `{ action: "approve", ids: [...] }` promotes selected transactions
- [ ] Promotion inserts into `transactions` and updates staging status to `APPROVED`
- [ ] Duplicate transactions (same account_id + date + amount + description_raw) are silently skipped during promotion
- [ ] `PATCH /api/transactions/staged` with `{ action: "reject", ids: [...] }` marks as `REJECTED`
- [ ] Review page renders the `TransactionReviewTable` with sortable, selectable rows
- [ ] Inline editing saves changes on blur/enter
- [ ] Bulk approve/reject updates all selected rows
- [ ] Transactions page shows only promoted (approved) transactions
- [ ] `GET /api/transactions` supports pagination and returns correct total count

## Architecture Notes

- Promotion is atomic — if any insert fails (for reasons other than dedup conflict), the entire batch rolls back. Dedup conflicts are expected and counted, not treated as errors.
- The review table is a client component with local state for edits. Changes are saved to the API on blur/enter, not via a "Save All" button — this matches the inline editing pattern.
- Confidence scores come from Claude's self-assessment during parsing (EPIC-03). They help users prioritize review: low-confidence rows need more attention.
- Category editing in the review table uses a dropdown populated from the `categories` table (seeded in EPIC-01). Users pick from existing categories; creating new categories is handled in EPIC-05.
