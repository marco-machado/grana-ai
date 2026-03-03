# Data Model: Statement Processing Pipeline

**Feature**: 003-statement-processing
**Date**: 2026-03-02

## New Entities

### ProcessedStatement

Tracks which statement content has already been processed to prevent reprocessing.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| source_id | UUID | FK → Source, NOT NULL | Scopes dedup per source |
| statement_hash | String | NOT NULL | SHA-256 of raw content |
| processed_at | DateTime | NOT NULL, default now() | |

**Unique constraint**: `(source_id, statement_hash)` — same content from different sources is processed independently.

**Relationships**: belongs to Source.

---

### StagingTransaction

Parsed transactions awaiting human review before promotion to the final transactions table.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| date | DateTime | NOT NULL | Transaction date (DATE precision) |
| description_raw | String | NOT NULL | Verbatim from statement |
| description_clean | String | NOT NULL | AI-normalized, human-friendly |
| amount | Decimal | NOT NULL | Negative=debit, positive=credit (BRL) |
| account_id | UUID | FK → Account, NOT NULL | |
| source_id | UUID | FK → Source, NOT NULL | |
| category_id | UUID | FK → Category, nullable | Resolved from category_suggestion |
| category_suggestion | String | nullable | AI's raw category name suggestion |
| confidence | Float | nullable, 0.0–1.0 | AI parsing confidence per transaction |
| status | StagingStatus | NOT NULL, default PENDING | |
| statement_hash | String | NOT NULL | Links to originating ProcessedStatement |
| created_at | DateTime | NOT NULL, default now() | |

**Relationships**: belongs to Account, belongs to Source, optionally belongs to Category.

**Notes**:
- `category_suggestion` stores the AI's raw text suggestion (matched against Category names)
- `category_id` is resolved from `category_suggestion` when a match is found in the taxonomy
- No unique constraint — duplicates are resolved during human review/promotion
- `statement_hash` links back to which processed statement produced this row

---

### Transaction

The final, approved transaction record (core fields only — feature epics add columns later).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| date | DateTime | NOT NULL | Transaction date (DATE precision) |
| description_raw | String | NOT NULL | Verbatim from statement |
| description_clean | String | NOT NULL | AI-normalized, human-friendly |
| amount | Decimal | NOT NULL | Negative=debit, positive=credit (BRL) |
| account_id | UUID | FK → Account, NOT NULL | |
| source_id | UUID | FK → Source, NOT NULL | |
| category_id | UUID | FK → Category, nullable | |
| created_at | DateTime | NOT NULL, default now() | |
| updated_at | DateTime | NOT NULL, auto-updated | |

**Unique constraint**: `(account_id, date, amount, description_raw)` — transaction-level dedup via `ON CONFLICT DO NOTHING`.

**Relationships**: belongs to Account, belongs to Source, optionally belongs to Category.

---

### StagingStatus (Enum)

| Value | Description |
|-------|-------------|
| PENDING | Awaiting human review |
| APPROVED | Approved for promotion to transactions |
| REJECTED | Rejected by user during review |

---

## Modified Entities

### Source (existing)

New relationships added:
- has many StagingTransaction
- has many Transaction
- has many ProcessedStatement

### Account (existing)

New relationships added:
- has many StagingTransaction
- has many Transaction

### Category (existing)

New relationships added:
- has many StagingTransaction
- has many Transaction

---

## Prisma Schema Changes

```prisma
enum StagingStatus {
  PENDING
  APPROVED
  REJECTED
}

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
  confidence          Float?
  status              StagingStatus @default(PENDING)
  statement_hash      String
  created_at          DateTime      @default(now())
}

model ProcessedStatement {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  source_id      String   @db.Uuid
  source         Source   @relation(fields: [source_id], references: [id])
  statement_hash String
  processed_at   DateTime @default(now())

  @@unique([source_id, statement_hash])
}
```

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| ProcessedStatement | statement_hash | Non-empty string, SHA-256 format |
| StagingTransaction | date | Valid date, not in the future |
| StagingTransaction | amount | Non-zero decimal |
| StagingTransaction | description_raw | Non-empty string |
| StagingTransaction | description_clean | Non-empty string |
| StagingTransaction | confidence | 0.0 ≤ value ≤ 1.0 (when present) |
| Processing request | content | Non-empty, non-whitespace string |
| Processing request | accountId | Valid UUID referencing existing Account |
| Processing request | sourceId | Valid UUID referencing existing Source |

## State Transitions

### StagingTransaction.status

```
PENDING → APPROVED (user approves during review)
PENDING → REJECTED (user rejects during review)
```

Note: The review/promotion workflow is out of scope for this epic. Transactions are created with PENDING status only.
