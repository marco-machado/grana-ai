# Tasks: Statement Processing Pipeline

**Input**: Design documents from `/specs/003-statement-processing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Phase-integrated — test tasks follow each phase checkpoint per Constitution VII (Testing Discipline). Mock Claude API at external boundary only. Run with `npx vitest run`.

**Organization**: Tasks grouped by user story. US1 & US2 are both P1 but separated into distinct phases since dedup logic is an incremental addition to the core pipeline.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure environment for the processing pipeline

- [ ] T001 Install @anthropic-ai/sdk, zod, and unpdf dependencies in app/package.json
- [ ] T002 [P] Add ANTHROPIC_API_KEY to env.example and pass it to the app service in docker-compose.yml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, validation schemas, and AI infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until T003–T004 are complete. T005–T008 can run in parallel once dependencies are installed.

- [ ] T003 Add StagingStatus enum, Transaction, StagingTransaction, ProcessedStatement models and update Account/Source/Category relations per data-model.md Prisma schema in app/prisma/schema.prisma
- [ ] T004 Run Prisma migration (`npx prisma migrate dev --name add-transaction-staging-models`) and regenerate client in app/prisma/
- [ ] T005 [P] Create ProcessStatementRequest Zod validation schema per contracts/api.md in app/lib/validation.ts
- [ ] T006 [P] Create Anthropic SDK singleton with claude-sonnet-4-5-20250929 model constant and maxRetries: 2 per research.md R-002 in app/lib/ai/client.ts
- [ ] T007 [P] Create AITransactionOutput Zod schema for Claude structured output (transactions array with date, description_raw, description_clean, amount, category_suggestion, confidence) per contracts/api.md in app/lib/ai/schema.ts
- [ ] T008 [P] Create category taxonomy loader (query Category hierarchy via Prisma, format as "Parent: Child1, Child2" for prompt injection, cache result) per research.md R-006 in app/lib/ai/taxonomy.ts

**Checkpoint**: Foundation ready — all schemas, AI client, and validation in place

---

## Phase 3: US1 — Process a Single Bank Statement (Priority: P1) MVP

**Goal**: Build the core processing pipeline: receive raw statement text → parse with Claude API using zodOutputFormat → insert structured transactions into staging with PENDING status

**Independent Test**: POST raw statement text to /api/statements/process with valid account/source IDs and verify structured transactions appear in staging_transactions with correct fields and PENDING status

- [ ] T009 [US1] Create AI parsing logic with system prompt (DD/MM/YYYY→YYYY-MM-DD date conversion, 1.234,56→1234.56 number format, negative=debit/positive=credit sign convention, description_raw vs description_clean semantics, bank-specific hints via source name, category taxonomy injection, skip non-transaction lines) using zodOutputFormat + client.messages.parse() in app/lib/ai/parse-statement.ts
- [ ] T010 [US1] Create statement processor orchestration (compute SHA-256 hash of content, call AI parser from T009, validate response against Zod schema, resolve category_suggestion strings to category_ids by matching Category names, batch insert staging transactions with createMany and PENDING status, store statement_hash on each staging row) in app/lib/statement-processor.ts
- [ ] T011 [US1] Create POST /api/statements/process API route (parse request body with ProcessStatementRequest Zod schema, verify account and source exist via Prisma, delegate to statement processor, return success response per contracts/api.md, handle 400 validation errors and 502 AI service errors, do NOT record hash on failure) in app/app/api/statements/process/route.ts

- [ ] T011b [US1] Test statement processor and API route (mock Claude API with fixture response, verify staging transactions inserted with correct fields and PENDING status, verify amount sign convention negative=debit/positive=credit, verify 400 for empty content and missing/invalid account/source IDs, verify 502 when AI service fails, verify statement hash NOT recorded on AI failure) using Vitest in app/lib/__tests__/statement-processor.test.ts and app/app/api/statements/process/__tests__/route.test.ts

**Checkpoint**: Core pipeline functional — statements can be parsed and staged via API

---

## Phase 4: US2 — Deduplication of Previously Processed Statements (Priority: P1)

**Goal**: Add statement-level deduplication: check ProcessedStatement table before parsing, record hash after success, return "already processed" for duplicates

**Independent Test**: Submit the same statement content twice for the same source and verify the second submission returns alreadyProcessed: true without creating new staging transactions

- [ ] T012 [US2] Add deduplication logic to statement processor (before AI parsing: query ProcessedStatement by source_id + statement_hash, return early if found; after successful insert: create ProcessedStatement record; on AI failure: skip recording so user can retry) in app/lib/statement-processor.ts
- [ ] T013 [US2] Handle "already processed" response path in API route (when processor returns duplicate flag, return {alreadyProcessed: true, transactionCount: 0, duplicatesSkipped: 0} per contracts/api.md) in app/app/api/statements/process/route.ts

- [ ] T013b [US2] Test dedup logic (verify hash check returns already-processed when same content+source submitted twice, verify hash NOT recorded on AI failure allowing retry, verify cross-source independence — same content with different source_id processes independently, verify no new staging rows created on duplicate) using Vitest in app/lib/__tests__/statement-processor.test.ts

**Checkpoint**: Full P1 pipeline complete — parsing + deduplication working end-to-end

---

## Phase 5: US3 — Manual Statement Upload via UI (Priority: P2)

**Goal**: Provide a web page where the user can select account/source, paste text or upload a file (with client-side PDF extraction), and see a result summary

**Independent Test**: Open /upload, select an account and source from dropdowns, paste statement text, click "Processar", verify result summary shows transaction count and duplicate count

- [ ] T014 [P] [US3] Create GET /api/accounts route (query all accounts via Prisma, return id/name/type array per contracts/api.md) in app/app/api/accounts/route.ts
- [ ] T015 [P] [US3] Create GET /api/sources route (filter by accountId query param via Prisma, return id/name/type/identifier array per contracts/api.md) in app/app/api/sources/route.ts
- [ ] T016 [US3] Create UploadForm client component (account dropdown fetching GET /api/accounts, source dropdown fetching GET /api/sources?accountId=, textarea for paste, file input accepting .txt/.pdf with drag-and-drop, client-side PDF text extraction via dynamic import("unpdf") using getDocumentProxy + extractText with mergePages: true per research.md R-003, submit to POST /api/statements/process, display result summary with transactionCount and duplicatesSkipped) in app/components/UploadForm.tsx
- [ ] T017 [US3] Create manual upload page with pt-BR labels (title "Upload de Extrato", three UI states: idle form / loading spinner / result summary, error display for validation and service errors, integrate UploadForm component) in app/app/(dashboard)/upload/page.tsx

**Checkpoint**: Users can upload statements via browser — no n8n required

---

## Phase 6: US4 — Batch Mode for Historical Backfill (Priority: P3)

**Goal**: Support large multi-page statements by chunking content, processing chunks in parallel, and merging results

**Independent Test**: Submit a large multi-page statement with batchMode: true and verify all transactions from all pages are parsed and inserted without timeout

- [ ] T018 [US4] Add chunking logic to statement processor (detect page boundaries via "Page X of Y" markers, fall back to ~50-line splits per research.md R-004, process chunks with Promise.allSettled for partial failure tolerance, merge transaction arrays from successful chunks, dedup merged results by date+amount+description_raw before insertion, report per-chunk failures) in app/lib/statement-processor.ts
- [ ] T019 [US4] Handle batchMode flag in API route (pass flag to processor, include batchResults object with totalChunks/successfulChunks/failedChunks/failures in response per contracts/api.md, return 413 for oversized non-batch requests suggesting batch mode) in app/app/api/statements/process/route.ts
- [ ] T020 [US4] Add batch mode toggle (checkbox with label "Modo batch para extratos grandes") to UploadForm component in app/components/UploadForm.tsx

- [ ] T019b [US4] Test batch mode (verify content chunked by page boundaries and ~50-line fallback, verify Promise.allSettled partial failure tolerance — successful chunks return transactions while failed chunks reported, verify merged results deduped by date+amount+description_raw before insertion, verify batchResults object with totalChunks/successfulChunks/failedChunks counts) using Vitest in app/lib/__tests__/statement-processor.test.ts

**Checkpoint**: Historical backfill supported — large statements processed reliably

---

## Phase 7: US5 — n8n Integration Documentation (Priority: P3)

**Goal**: Document how n8n should call the processing endpoint for automated daily ingestion

**Independent Test**: Follow the guide to configure an n8n HTTP Request node and verify a test statement is processed successfully

- [ ] T021 [US5] Create n8n integration guide (expected JSON payload format, required fields, example curl command, example n8n HTTP Request node configuration, error handling guidance, batch mode usage for large statements) in app/docs/n8n-integration.md

**Checkpoint**: External systems can integrate with the processing endpoint

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation across all stories

- [ ] T022 Run quickstart.md validation (verify dependency install, migration, API curl test, upload page flow all work end-to-end per specs/003-statement-processing/quickstart.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (npm packages installed). T003→T004 sequential; T005–T008 parallel after T001
- **US1 (Phase 3)**: Depends on Phase 2 completion. Sequential: T009→T010→T011
- **US2 (Phase 4)**: Depends on US1 (modifies statement-processor.ts and route.ts)
- **US3 (Phase 5)**: Depends on US1 (calls processing endpoint). Can run in parallel with US2 (creates new files only)
- **US4 (Phase 6)**: Depends on US1 + US2 + US3 (modifies processor, route, and UploadForm)
- **US5 (Phase 7)**: Depends on US1 (documents the endpoint). Can run in parallel with US2–US4
- **Polish (Phase 8)**: Depends on all desired stories being complete

### User Story Dependency Graph

```
Phase 1 → Phase 2 → US1 (P1) ──→ US2 (P1) ──→ US4 (P3)
                          │                        ↑
                          ├──→ US3 (P2) ───────────┘
                          │
                          └──→ US5 (P3)
```

### Parallel Opportunities

**Within Phase 2**: T005 + T006 + T007 + T008 (all create independent files)

**After US1 completes**: US2 and US3 can run in parallel:
- US2 modifies: statement-processor.ts, route.ts
- US3 creates new: accounts/route.ts, sources/route.ts, UploadForm.tsx, upload/page.tsx
- No file conflicts

**After US1 completes**: US5 can run in parallel with all other stories

---

## Parallel Example: Phase 2 Foundational

```bash
# After T003→T004 (schema + migration), launch in parallel:
Task T005: "Create ProcessStatementRequest Zod schema in app/lib/validation.ts"
Task T006: "Create Anthropic SDK singleton in app/lib/ai/client.ts"
Task T007: "Create AITransactionOutput Zod schema in app/lib/ai/schema.ts"
Task T008: "Create category taxonomy loader in app/lib/ai/taxonomy.ts"
```

## Parallel Example: After US1

```bash
# US2 and US3 can proceed simultaneously:
# Stream A (US2): T012→T013
# Stream B (US3): T014+T015 (parallel) → T016 → T017
# Stream C (US5): T021
```

---

## Implementation Strategy

### MVP First (US1 Only — Phases 1–3)

1. Complete Phase 1: Setup (install deps, env vars)
2. Complete Phase 2: Foundational (schema, migration, AI infra)
3. Complete Phase 3: US1 — Core parsing pipeline
4. **STOP AND VALIDATE**: POST a test statement via curl, verify staging transactions
5. This is a deployable MVP — statements can be parsed via API

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1 → Core pipeline works → **Validate via curl** (MVP)
3. US2 → Dedup prevents reprocessing → **Validate by submitting same statement twice**
4. US3 → Browser upload works → **Validate via upload page** (user-facing MVP)
5. US4 → Large statements supported → **Validate with multi-page statement**
6. US5 → n8n guide available → **Validate by following the guide**
7. Polish → End-to-end quickstart validation
