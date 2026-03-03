# EPIC-02: Data Model & Source Management

**Status:** Not Started
**Dependencies:** EPIC-01

## Overview

Add the transaction and staging schemas to the database and build CRUD for bank accounts and data sources. This epic establishes the data foundation that all ingestion and processing depends on, and sets the CRUD patterns (API route structure, validation, error handling, response format) that every subsequent epic follows.

## Deliverables

### Prisma Migration
- Extend `schema.prisma` with `Transaction`, `StagingTransaction`, `ProcessedStatement` models
- Run migration to create new tables

### Account CRUD
- `app/app/api/accounts/route.ts` — GET (list), POST (create)
- `app/app/api/accounts/[id]/route.ts` — GET (single), PATCH (partial update), DELETE

### Source CRUD
- `app/app/api/sources/route.ts` — GET (list with account relation), POST (create)
- `app/app/api/sources/[id]/route.ts` — GET (single), PATCH (partial update), DELETE

### UI
- `app/app/(dashboard)/sources/page.tsx` — Source management page:
  - Account list section with inline add/edit forms
  - Source list section with source creation form
  - Each source shows linked account name
- `app/components/AccountList.tsx` — account list with inline form
- `app/components/SourceList.tsx` — source list with creation form (name, type dropdown, identifier, account select)

### Shared Utilities
- `app/lib/api.ts` — standardized API response helpers (`ok()`, `created()`, `badRequest()`, `notFound()`, `conflict()`)
- `app/lib/schemas/account.ts` — Zod schemas for account payloads (create, update)
- `app/lib/schemas/source.ts` — Zod schemas for source payloads (create, update)

## Database Changes

### New Tables
| Table | Key Fields |
|-------|-----------|
| `transactions` | id, date, description_raw, description_clean, amount (Decimal), account_id (FK), source_id (FK), category_id (FK, nullable), created_at, updated_at |
| `staging_transactions` | id, date, description_raw, description_clean, amount (Decimal), account_id (FK), source_id (FK), category_id (FK, nullable), category_suggestion (text, nullable), confidence (Decimal(3,2), nullable), status (enum: PENDING/APPROVED/REJECTED), statement_hash (text), created_at, updated_at |
| `processed_statements` | id, source_id (FK), statement_hash (text, unique), processed_at |

### Constraints
- `transactions`: unique constraint on `(account_id, date, amount, description_raw)` — dedup at insert time via `ON CONFLICT DO NOTHING`
- `sources`: unique constraint on `(account_id, type, identifier)` — prevents duplicate sources per account
- `staging_transactions`: no unique constraint (duplicates resolved during review/promotion)

### New Enums
- `StagingStatus`: `PENDING`, `APPROVED`, `REJECTED`

## Open Decisions Resolved

- **H (Staging table schema):** Resolved. `staging_transactions` mirrors `transactions` with additional fields: `category_suggestion` (Claude's first-pass guess), `confidence` (0–1 Decimal(3,2)), `status` (pending/approved/rejected), and `statement_hash` (links back to which statement produced this row).
- **I (Prisma schema):** Continues. Core transaction models added; feature-specific columns added by later epics.

## Acceptance Criteria

- [ ] Prisma migration applies cleanly on top of EPIC-01's schema
- [ ] `POST /api/accounts` creates an account and returns it with 201
- [ ] `GET /api/accounts` lists all accounts
- [ ] `PATCH /api/accounts/:id` partially updates an account
- [ ] `DELETE /api/accounts/:id` deletes an account (fails if sources reference it)
- [ ] `POST /api/sources` creates a source linked to an account
- [ ] `GET /api/sources` lists sources with their account names
- [ ] Sources page renders with account and source management sections
- [ ] SourceForm validates required fields and shows errors
- [ ] `transactions` table has the unique constraint on `(account_id, date, amount, description_raw)`
- [ ] Zod schemas reject invalid payloads with descriptive error messages

## Architecture Notes

- The `transactions` table is created with **core fields only**. Feature epics (7, 8, 9) add their columns (`is_recurring`, `recurring_item_id`, `installment_group_id`, `is_savings_transfer`, `saving_goal_id`) via incremental migrations. This keeps each migration small and reversible.
- API routes return consistent JSON: `{ data, error }`. HTTP status codes carry status semantics (201 created, 400 validation, 404 not found, 409 conflict). The `ok()`, `created()`, `badRequest()`, `notFound()`, and `conflict()` helpers enforce this across the app.
- Zod is used for runtime validation in API routes. Schemas live in `lib/schemas/` (one file per entity) and grow as new entities are added in later epics.
- Confidence scores use `Decimal(3,2)` instead of Float to align with the data integrity principle (NUMERIC, never floating-point).
- Source `identifier` stores different values depending on `type`: sender email address for EMAIL, file glob for CSV, endpoint URL for API, freeform label for MANUAL.
