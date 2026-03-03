# Implementation Plan: Statement Processing Pipeline

**Branch**: `003-statement-processing` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-statement-processing/spec.md`

## Summary

Build the core statement processing pipeline that receives raw bank statement text, parses it with Claude API using structured output extraction (Zod + `zodOutputFormat`), deduplicates against previously processed statements via SHA-256 hashing, and inserts parsed transactions into a staging table with PENDING status. Includes a manual upload UI page for testing the pipeline without n8n, with client-side PDF text extraction via `unpdf`.

## Technical Context

**Language/Version**: TypeScript 5.8+ (Node 22 Alpine)
**Primary Dependencies**: Next.js 15 (App Router), Prisma 6, `@anthropic-ai/sdk`, `zod`, `unpdf`
**Storage**: PostgreSQL 17 (Docker), accessed via Prisma. New models: Transaction, StagingTransaction, ProcessedStatement.
**Testing**: Vitest (single-run mode: `npx vitest run`). Mock Claude API at external boundary.
**Target Platform**: Docker Compose (self-hosted, local network)
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: <30s for 50-line statement processing (SC-001), <1s duplicate detection (SC-002)
**Constraints**: Single user, BRL only, no auth. Statement content as plain text input (PDF extraction client-side).
**Scale/Scope**: Single user processing ~1 statement/day. Batch mode supports up to 500 lines.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Check

| Principle | Status | How Satisfied |
|-----------|--------|---------------|
| I. Data Integrity | ✅ PASS | Amounts stored as Decimal(12,2), negative=debit/positive=credit. description_raw/description_clean split enforced. Categories via parent_id hierarchy. |
| II. Two-Layer UI | ✅ PASS | Upload page is Next.js (write layer). No Metabase write operations. |
| III. AI-Assisted, Human-Verified | ✅ PASS | Claude parses statements → staging with PENDING status → human review before promotion (review workflow out of scope, but staging enforces the gate). Category suggestions are best-effort; categorization rules engine deferred per spec. |
| IV. Idempotent Processing | ✅ PASS | SHA-256 hash per source in processed_statements prevents reprocessing. Unique constraint on transactions `(account_id, date, amount, description_raw)` with ON CONFLICT DO NOTHING catches transaction-level duplicates. Batch insert uses upsert semantics. |
| V. Simplicity | ✅ PASS | Single user, BRL only, no auth. No speculative abstractions. Batch mode only when explicitly enabled. |
| VI. Code Quality | ✅ PASS | Strict TypeScript (already enabled). No `any` types — Zod schemas provide type inference. Prisma import convention followed. |
| VII. Testing Discipline | ✅ PASS | Vitest run (single-run). Mock Claude API only (external boundary). Test DB operations and API routes as priority. |
| VIII. UX Consistency | ✅ PASS | Upload page in pt-BR. Three states (loading/empty/error). BRL formatting. Tailwind-only styling. |
| IX. Performance | ✅ PASS | <30s target for 50 lines (SC-001). Dedup check is a single indexed query (<1s). No N+1 patterns. |

### Post-Design Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Data Integrity | ✅ PASS | Prisma schema uses `@db.Decimal(12, 2)` for amounts. `@db.Date` for transaction dates. |
| II. Two-Layer UI | ✅ PASS | No changes to Metabase layer. Upload page is a Next.js write page. |
| III. AI-Assisted, Human-Verified | ✅ PASS | AI output validated against Zod schema before insertion. category_suggestion stored alongside resolved category_id. All transactions start as PENDING. |
| IV. Idempotent Processing | ✅ PASS | `@@unique([source_id, statement_hash])` on ProcessedStatement. `@@unique([account_id, date, amount, description_raw])` on Transaction. Staging insert uses plain createMany (no skipDuplicates — staging allows duplicates). |
| V. Simplicity | ✅ PASS | Minimal file structure. No unnecessary abstractions. |
| VI. Code Quality | ✅ PASS | Zod for validation at API boundary. AI client as singleton. Type-safe throughout. |
| VII. Testing Discipline | ✅ PASS | Test plan covers: DB operations, API route contracts, AI parsing service (mocked), hashing/dedup logic. |
| VIII. UX Consistency | ✅ PASS | Upload page labels in pt-BR. Result summary shows counts in natural language. Error messages are actionable. |
| IX. Performance | ✅ PASS | Single DB query for dedup check (indexed). Batch mode for large statements. Category taxonomy cached. |

**Gate result**: ALL PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-statement-processing/
├── plan.md              # This file
├── research.md          # Phase 0 output — 6 research decisions
├── data-model.md        # Phase 1 output — 3 new entities + enum
├── quickstart.md        # Phase 1 output — setup and testing guide
├── contracts/
│   └── api.md           # Phase 1 output — API endpoint contracts
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── prisma/
│   └── schema.prisma              # Updated: +Transaction, +StagingTransaction, +ProcessedStatement, +StagingStatus
├── lib/
│   ├── prisma.ts                  # Existing: PrismaClient singleton
│   ├── validation.ts              # New: Zod schemas for API request validation
│   ├── ai/
│   │   ├── client.ts              # New: Anthropic SDK singleton + model constant
│   │   ├── schema.ts              # New: Zod schema for Claude structured output
│   │   ├── parse-statement.ts     # New: AI parsing logic with prompt construction
│   │   └── taxonomy.ts            # New: Category taxonomy loader for AI prompt
│   └── statement-processor.ts     # New: Core orchestration (hash → dedup → parse → insert)
├── app/
│   ├── api/
│   │   ├── accounts/
│   │   │   └── route.ts           # New: GET accounts list (for upload dropdown)
│   │   ├── sources/
│   │   │   └── route.ts           # New: GET sources list (for upload dropdown)
│   │   └── statements/
│   │       └── process/
│   │           └── route.ts       # New: POST statement processing endpoint
│   └── (dashboard)/
│       └── upload/
│           └── page.tsx           # New: Manual upload page
├── components/
│   └── UploadForm.tsx             # New: Upload form with file handling + result display
├── docs/
│   └── n8n-integration.md        # New: n8n setup guide (payload format, example workflow)
```

**Structure Decision**: Follows existing Next.js App Router patterns from EPIC-01. AI-related code isolated in `lib/ai/`. Processing logic in `lib/statement-processor.ts` as a service layer. API routes are thin handlers that delegate to the service layer.

## Constitution Tradeoffs

**Principle III (categorization rules)**: Constitution requires keyword/pattern rules before AI categorization. This epic stores `category_suggestion` as a best-effort parsing output — it is NOT the categorization pipeline. The full pipeline (rules engine + AI backfill for uncategorized rows) will be implemented in a future epic. The suggestion stored here may be overwritten by that pipeline.
