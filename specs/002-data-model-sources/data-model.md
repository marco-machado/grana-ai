# Data Model: Data Model & Source Management

**Feature**: 002-data-model-sources
**Date**: 2026-03-02

## Entity Overview

```text
┌──────────┐     1:N     ┌──────────┐
│ Account  │────────────▶│  Source   │
└──────────┘             └──────────┘
     │                        │
     │ 1:N                    │ 1:N              1:N
     ▼                        ▼                   │
┌──────────────┐    ┌──────────────────────┐      │
│ Transaction  │◀───│  StagingTransaction  │      │
└──────────────┘    └──────────────────────┘      │
     │                                            │
     │ N:1 (optional)                             ▼
     ▼                              ┌──────────────────────┐
┌──────────┐                        │ ProcessedStatement   │
│ Category │                        └──────────────────────┘
└──────────┘
```

**Legend**: Solid arrows = foreign key relationship. Direction = "belongs to" (arrow points to parent).

## Enums

### Existing (unchanged)

| Enum | Values | Purpose |
|------|--------|---------|
| AccountType | CHECKING, CREDIT, SAVINGS | Bank account classification |
| SourceType | EMAIL, CSV, API, MANUAL | Ingestion endpoint type |

### New

| Enum | Values | Purpose |
|------|--------|---------|
| StagingStatus | PENDING, APPROVED, REJECTED | Transaction review state |

**State transitions**:
```text
PENDING → APPROVED  (promoted to transactions table)
PENDING → REJECTED  (discarded)
```
Transitions are one-way. No returning to PENDING after review.

## Models

### Account (existing — modified)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | `gen_random_uuid()` |
| name | String | required | User-assigned label (e.g., "Nubank") |
| type | AccountType | required | CHECKING, CREDIT, or SAVINGS |
| created_at | DateTime | auto | Set on creation |
| updated_at | DateTime | auto | Updated on modification |

**Relations added**: `transactions Transaction[]`, `staging_transactions StagingTransaction[]`

**Deletion rule**: Blocked if sources, transactions, or staging_transactions exist (database RESTRICT via required foreign keys).

### Source (existing — modified)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | `gen_random_uuid()` |
| name | String | required | User-assigned label (e.g., "Nubank Email") |
| type | SourceType | required | EMAIL, CSV, API, or MANUAL |
| identifier | String | required | Meaning varies by type (see below) |
| account_id | UUID | FK → Account, required | Owning account |
| created_at | DateTime | auto | Set on creation |
| updated_at | DateTime | auto | Updated on modification |

**Unique constraint**: `(account_id, type, identifier)` — prevents duplicate sources per account.

**Identifier semantics by type**:
| Type | Identifier meaning | Example |
|------|-------------------|---------|
| EMAIL | Sender email address | `statements@nubank.com.br` |
| CSV | File glob pattern | `nubank_*.csv` |
| API | Endpoint URL | `https://api.bank.com/statements` |
| MANUAL | Freeform label | `Manual entries` |

**Relations added**: `transactions Transaction[]`, `staging_transactions StagingTransaction[]`, `processed_statements ProcessedStatement[]`

### Category (existing — modified)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | `gen_random_uuid()` |
| name | String | required | Category name in pt-BR |
| parent_id | UUID? | FK → Category (self), optional | Null = top-level category |
| created_at | DateTime | auto | Set on creation |

**Unique constraint**: `(name, parent_id)` — prevents duplicate names under same parent.

**Relations added**: `transactions Transaction[]`, `staging_transactions StagingTransaction[]`

### Transaction (new)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | `gen_random_uuid()` |
| date | Date | required | Transaction date (date only, no time) |
| description_raw | String | required | Verbatim text from bank statement |
| description_clean | String | required | AI-normalized, human-friendly version |
| amount | Decimal(12,2) | required | Negative=debit, positive=credit (BRL) |
| account_id | UUID | FK → Account, required | Owning bank account |
| source_id | UUID | FK → Source, required | Ingestion source |
| category_id | UUID? | FK → Category, optional | Assigned category (null = uncategorized) |
| created_at | DateTime | auto | Set on creation |
| updated_at | DateTime | auto | Updated on modification |

**Deduplication constraint**: `@@unique([account_id, date, amount, description_raw])` — inserts with ON CONFLICT DO NOTHING silently skip duplicates.

**Validation rules** (application-level, enforced by future ingestion code):
- `amount` must not be zero
- `description_raw` must not be empty
- `date` must not be in the future

### StagingTransaction (new)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | `gen_random_uuid()` |
| date | Date | required | Transaction date |
| description_raw | String | required | Verbatim from statement |
| description_clean | String | required | AI-normalized version |
| amount | Decimal(12,2) | required | Negative=debit, positive=credit |
| account_id | UUID | FK → Account, required | Owning account |
| source_id | UUID | FK → Source, required | Ingestion source |
| category_id | UUID? | FK → Category, optional | Resolved category (null = uncategorized) |
| category_suggestion | String? | optional | AI-suggested category name |
| confidence_score | Decimal(3,2)? | optional | AI confidence 0.00–1.00 |
| status | StagingStatus | required, default PENDING | Review state |
| statement_hash | String | required | Links back to source statement |
| created_at | DateTime | auto | Set on creation |
| updated_at | DateTime | auto | Updated on modification |

**No unique constraint** — duplicates resolved during human review/promotion process (per spec assumptions).

**Validation rules** (application-level, enforced by future ingestion code):
- `confidence_score` must be between 0.00 and 1.00 (inclusive)
- `statement_hash` must match a record in ProcessedStatement

### ProcessedStatement (new)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | `gen_random_uuid()` |
| source_id | UUID | FK → Source, required | Source that produced this statement |
| statement_hash | String | unique | SHA-256 of raw email/file content |
| processed_at | DateTime | auto, default now() | When processing completed |

**Unique constraint**: `statement_hash` — prevents reprocessing the same statement.

## Prisma Schema Changes

### New enum

```prisma
enum StagingStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### New models

```prisma
model Transaction {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  date              DateTime  @db.Date
  description_raw   String
  description_clean String
  amount            Decimal   @db.Decimal(12, 2)
  account_id        String    @db.Uuid
  account           Account   @relation(fields: [account_id], references: [id])
  source_id         String    @db.Uuid
  source            Source    @relation(fields: [source_id], references: [id])
  category_id       String?   @db.Uuid
  category          Category? @relation(fields: [category_id], references: [id])
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  @@unique([account_id, date, amount, description_raw])
}

model StagingTransaction {
  id                  String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  date                DateTime      @db.Date
  description_raw     String
  description_clean   String
  amount              Decimal       @db.Decimal(12, 2)
  account_id          String        @db.Uuid
  account             Account       @relation(fields: [account_id], references: [id])
  source_id           String        @db.Uuid
  source              Source        @relation(fields: [source_id], references: [id])
  category_id         String?       @db.Uuid
  category            Category?     @relation(fields: [category_id], references: [id])
  category_suggestion String?
  confidence_score    Decimal?      @db.Decimal(3, 2)
  status              StagingStatus @default(PENDING)
  statement_hash      String
  created_at          DateTime      @default(now())
  updated_at          DateTime      @updatedAt
}

model ProcessedStatement {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  source_id      String   @db.Uuid
  source         Source   @relation(fields: [source_id], references: [id])
  statement_hash String   @unique
  processed_at   DateTime @default(now())
}
```

### Modified models (reverse relations only)

```prisma
model Account {
  // ... existing fields unchanged ...
  sources               Source[]
  transactions          Transaction[]
  staging_transactions  StagingTransaction[]
}

model Source {
  // ... existing fields unchanged ...
  transactions          Transaction[]
  staging_transactions  StagingTransaction[]
  processed_statements  ProcessedStatement[]
}

model Category {
  // ... existing fields unchanged ...
  transactions          Transaction[]
  staging_transactions  StagingTransaction[]
}
```

## Database Indexes

Prisma automatically creates indexes for:
- All `@id` fields (primary key index)
- All `@unique` fields and `@@unique` composites (unique index)
- All foreign key fields used in `@relation` (foreign key index)

No additional manual indexes needed for the current data volume (single user).
