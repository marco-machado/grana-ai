# Grana AI — Personal Finance Dashboard Architecture

## 1. Requirements Summary

| Dimension | Decision |
|---|---|
| Scope | Income, expenses, budgets, recurring bills, subscriptions, savings goals |
| Users | Single user |
| Data ingestion | Gmail statements (automated polling via Gmail API); extensible to CSV, API, manual |
| Currency | BRL only |
| Analysis type | Historical + predictive |
| Deployment | Self-hosted |
| AI role | Parsing, categorization, insights |

---

## 2. High-Level Architecture

```
[Email Server / Gmail]
        ↓  (Gmail API / OAuth)
[n8n — Orchestration Layer]
        ↓  (raw statement text/PDF)
[AI Parsing Layer — Claude API]
        ↓  (structured JSON)
[PostgreSQL — Source of Truth]
        ↓
[Dashboard — Metabase]
        ↑
[AI Insights Engine — on-demand queries]
```

---

## 3. Layer Breakdown

### 3.1 Ingestion (n8n)

- Polls email inbox on a daily schedule
- Matches sender email against `sources` table to resolve account
- Extracts attachments (PDF) or HTML body
- Passes `source_id` and `account_id` to AI parsing workflow automatically

### 3.2 AI Parsing (Claude API)

Responsible for:

- Extracting transactions from unstructured statement text
- Splitting description into `description_raw` (verbatim) and `description_clean` (normalized, human-friendly)
- Normalizing fields: `date`, `amount`, `type (debit/credit)`
- First-pass category suggestion

Claude is told the `source_id` and `account_id` by n8n before parsing — it never guesses which account it's processing.

Output schema per transaction:

```json
{
  "date": "2026-02-15",
  "description_raw": "AMZNPRIME*AB1C2D",
  "description_clean": "Amazon Prime",
  "amount": -49.90,
  "currency": "BRL",
  "category_suggestion": "Subscriptions",
  "confidence": 0.97
}
```

### 3.3 Storage (PostgreSQL)

#### Core Tables

**`sources`**
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | e.g. "Nubank Email", "Itaú CSV Import" |
| type | ENUM | email / csv / api / manual |
| identifier | TEXT | Sender email, file pattern, endpoint |
| account_id | UUID | FK → accounts |

**`accounts`**
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | e.g. "Nubank Credit" |
| type | ENUM | checking / credit / savings |
| currency | TEXT | ISO 4217 (BRL) |

**`transactions`**
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| date | DATE | |
| description_raw | TEXT | Verbatim from statement |
| description_clean | TEXT | Claude-normalized, human-friendly |
| amount | NUMERIC | Negative = debit |
| account_id | UUID | FK → accounts |
| source_id | UUID | FK → sources |
| category_id | UUID | FK → categories |
| is_recurring | BOOLEAN | Detected or manual |
| recurring_item_id | UUID | FK → recurring_items, nullable |
| installment_group_id | UUID | FK → installment_groups, nullable |
| is_savings_transfer | BOOLEAN | Flagged manually; system learns pattern over time |
| saving_goal_id | UUID | FK → saving_goals, nullable |

**`categories`**
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | e.g. "Restaurants" |
| parent_id | UUID | Self-ref FK for hierarchy (Food → Restaurants) |

**`budgets`**
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| category_id | UUID | FK → categories |
| amount | NUMERIC | |
| period | TEXT | YYYY-MM, nullable — null = default template |

**`recurring_items`**
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | |
| amount | NUMERIC | |
| frequency | ENUM | monthly / yearly / weekly |
| next_date | DATE | |
| type | ENUM | subscription / bill / installment |

**`saving_goals`**
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | |
| target_amount | NUMERIC | |
| deadline | DATE | nullable |
| linked_account_id | UUID | FK → accounts, nullable |

**`installment_groups`**
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| description | TEXT | e.g. "MacBook 12x" |
| total_amount | NUMERIC | Full purchase value |
| installments_total | INT | e.g. 12 |
| installments_paid | INT | |
| start_date | DATE | |

**`processed_statements`**
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| source_id | UUID | FK → sources |
| statement_hash | TEXT | SHA-256 of raw email/file content |
| processed_at | TIMESTAMP | |

#### Schema Notes

- **Budgets:** if no record exists for a given month, the system falls back to the most recent record for that category. A new entry is only needed when overriding the default.
- **Saving goals:** `current_amount` is not stored — it is computed by summing `transactions.amount` where `saving_goal_id` matches.
- **Installments:** each installment payment in `transactions` links back to an `installment_group` so the full liability is tracked, not just the monthly slice.
- **Deduplication:** two-level strategy — statement hash prevents reprocessing the same email/file; a unique constraint on `(account_id, date, amount, description_raw)` with `ON CONFLICT DO NOTHING` catches transaction-level duplicates. Fuzzy matching (same account + amount + date within 3-day window) is optional, added only if duplicates slip through in practice.

### 3.4 Processing Logic

- **Categorization rules engine** — keyword/pattern rules run first; Claude fills the gaps in a single batched API call
- **Recurring detection** — flags transactions matching same merchant + similar amount across ≥ 2 months
- **Savings transfer detection** — pattern match against previously flagged `is_savings_transfer` transactions
- **Budget vs. actual** — computed view, not stored
- **Predictions** — rolling average spend per category; savings projection based on current rate

### 3.5 n8n Workflow

Single workflow triggered on a daily schedule. Workflow 2 (processing) only runs if Workflow 1 (ingestion) produced new rows — avoiding unnecessary work.

```
Gmail Trigger (daily schedule)
  → Fetch all unprocessed emails from configured senders
  → For each email:
      - Hash content
      - Check processed_statements — skip if exists
  → If no new statements found: stop
  → Extract all new statement content (batch)
  → For each new statement:
      - Call Claude API with source_id, account_id, and statement content
      - Collect parsed transactions JSON
  → Bulk insert all parsed transactions into staging table
  → Mark all statements as processed in processed_statements
  → [Processing pass — runs only if staging has new rows]
  → Batch: run categorization rules across all new staging rows
  → Batch: call Claude API once for all uncategorized rows
  → Batch: run recurring detection across all new staging rows
  → Batch: run savings transfer pattern detection
  → Bulk upsert into transactions table (ON CONFLICT DO NOTHING)
  → Clean up staging table
```

### 3.5 Dashboard (Next.js + Metabase)

**Metabase** runs on `localhost:3001` for full exploration, ad-hoc queries, and building new questions. **Next.js** serves as the primary app shell on `localhost:3000` — it hosts write forms and embeds Metabase charts via signed iframes for a polished, unified view.

Metabase is the read/visualization layer. Next.js is the write/interaction layer. Same Metabase instance, two ways to access it.

| View | Contents |
|---|---|
| **Overview** | Net cash flow, savings rate %, top 5 spend categories this month |
| **Transactions** | Searchable, filterable full list + staged review |
| **Budget** | Category budget vs. actual, color-coded |
| **Recurring** | All subscriptions + bills, next payment dates, annual total |
| **Installments** | Active installment groups, remaining balance, end dates |
| **Savings Goals** | Progress bars, projected completion dates |
| **Trends** | Month-over-month by category, income stability, spend patterns |
| **Sources** | Source management |
| **Insights** | AI chat interface |

#### Next.js App Structure

```
app/
├── (dashboard)/
│   ├── page.tsx                  # Overview — embedded Metabase
│   ├── transactions/
│   │   ├── page.tsx              # Transaction list — embedded Metabase
│   │   └── review/
│   │       └── page.tsx          # Review staged transactions before promotion
│   ├── budgets/
│   │   └── page.tsx              # Budget list + create/edit forms
│   ├── recurring/
│   │   └── page.tsx              # Recurring items + confirm detected ones
│   ├── installments/
│   │   └── page.tsx              # Installment groups
│   ├── goals/
│   │   └── page.tsx              # Saving goals + create/edit forms
│   ├── sources/
│   │   └── page.tsx              # Source management
│   └── insights/
│       └── page.tsx              # AI chat interface
├── api/
│   ├── transactions/
│   │   ├── route.ts              # GET staged, POST promote, DELETE
│   │   └── [id]/route.ts
│   ├── budgets/route.ts
│   ├── recurring/route.ts
│   ├── goals/route.ts
│   ├── sources/route.ts
│   └── insights/route.ts         # Proxies to Claude API
└── components/
    ├── MetabaseEmbed.tsx          # Reusable signed iframe wrapper
    ├── TransactionReviewTable.tsx
    ├── forms/
    │   ├── BudgetForm.tsx
    │   ├── GoalForm.tsx
    │   ├── RecurringForm.tsx
    │   └── SourceForm.tsx
    └── chat/
        └── InsightsChat.tsx
```

### 3.6 AI Insights (on-demand)

A chat interface built into the Next.js app. Flow: user types query → Next.js fetches relevant data from PostgreSQL → sends data + query to Claude API → displays response inline. n8n is not involved — this keeps interaction low-latency and co-located with the rest of the app UI.

Example queries it should handle:

- *"How much did I spend on food last quarter?"*
- *"Am I on track for my emergency fund goal?"*
- *"What subscriptions haven't I used this month?"*

---

## 4. Data Flow (End-to-End)

```
1. n8n polls Gmail daily for emails from configured senders
2. Each email is hashed and checked against processed_statements — skipped if already processed
3. If nothing new: workflow stops
4. Statement content (PDF or HTML) sent to Claude with source_id and account_id
5. Claude returns structured transactions JSON (description_raw + description_clean)
6. All parsed transactions bulk inserted into staging table
7. All statements marked as processed
8. Categorization rules run across all staging rows; Claude fills uncategorized in one batched call
9. Recurring detection and savings transfer pattern detection run across all staging rows
10. Bulk upsert into transactions table (ON CONFLICT DO NOTHING)
11. Staging table cleared
12. Metabase dashboards reflect new data automatically
```

---

## 5. Key Design Decisions to Resolve

| # | Decision | Options | Recommendation |
|---|---|---|---|
| A | Human review step | Review before DB write / Fix errors after | Start with review; automate once patterns are trusted |
| B | Currency handling | ~~Multi-currency~~ → **BRL only** | Resolved. |
| C | Installment history | ~~Future only~~ → **Best-effort reconstruction from historical statements** | Resolved. Partial installment groups are valid; gaps filled manually if needed. |
| D | Email access method | ~~IMAP~~ → **Gmail API (OAuth)** | Resolved. n8n native Gmail node. |
| E | Input/review UI | ~~n8n forms / Appsmith / pgAdmin~~ → **Next.js custom app** | Resolved. Handles all write operations: transaction review, recurring confirmation, budgets, goals, sources. |
| F | Budget management | ~~Static~~ → **Template with monthly overrides** | Resolved. Null period = default template; YYYY-MM period = monthly override. Falls back to latest template if no override exists. |
| G | Saving goals tracking | ~~Manual~~ → **Computed from flagged transactions** | Resolved. `is_savings_transfer` flag on transactions; system learns pattern. `current_amount` computed, not stored. |
| H | Staging table schema | To be defined | Structure for temporary transaction storage before promotion to main table. |
| I | Prisma schema | To be defined | Full `schema.prisma` translating all DB tables. |
| J | Default category taxonomy | To be defined | Seed data for `categories` table — top-level and subcategories. |
| K | Categorization rules engine | To be defined | How rules are structured and stored (DB table vs. config file). |
| L | Historical data ingestion | To be defined | First-run behaviour when processing months of backlog. |

---

## 6. Stack Summary

| Component | Tool | Reason |
|---|---|---|
| Orchestration | n8n (self-hosted) | Visual workflows, email + webhook nodes |
| AI Parsing | Claude API | Best-in-class unstructured document extraction |
| Database | PostgreSQL | Relational, robust, free |
| ORM | Prisma | Type-safe DB access for Next.js |
| Web App | Next.js (via Claude Code) | Primary shell — write forms + embedded Metabase charts |
| BI Tool | Metabase (self-hosted) | Full UI on `localhost:3001` for exploration/learning; charts embedded in Next.js app |
| Infrastructure | Docker Compose | Single stack, easy local management |
