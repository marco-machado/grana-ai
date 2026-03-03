# Tasks: Data Model & Source Management

**Input**: Design documents from `/specs/002-data-model-sources/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included for API layer (Zod schemas and route handlers). Vitest with direct route handler imports, Prisma tested against real finance_test database with deleteMany() cleanup in beforeEach. Tests written after implementation (not TDD).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `app/` at repository root (Next.js App Router)
- API routes: `app/app/api/`
- Shared utilities: `app/lib/`
- Components: `app/components/`
- Schema: `app/prisma/schema.prisma`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and configure testing framework

- [x] T001 Install Zod and Vitest dependencies in `app/package.json` (`zod` as dependency, `vitest` as devDependency)
- [x] T002 Create Vitest configuration file at `app/vitest.config.ts` per plan.md (resolve `@/` alias to `app/`, exclude node_modules and generated)
- [x] T003 [P] Create test setup file at `app/test/setup.ts` (set DATABASE_URL to finance_test, globalSetup for Prisma migrate, beforeEach cleanup via deleteMany)
- [x] T004 [P] Add `test:run` script to `app/package.json` (`vitest run`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema changes and shared API utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Extend Prisma schema at `app/prisma/schema.prisma`: add `StagingStatus` enum, `Transaction`, `StagingTransaction`, `ProcessedStatement` models, and back-relations on `Account`, `Source`, `Category` per data-model.md
- [x] T006 Generate Prisma migration for the new schema (`npx prisma migrate dev --name add_transactions_staging`)
- [x] T007 [P] Create API response envelope helpers in `app/lib/api.ts` with `ok()`, `created()`, `badRequest()`, `notFound()`, `conflict()` functions returning `{ data, error }` shape per contracts/api.md
- [x] T008 [P] Create account Zod validation schemas in `app/lib/schemas/account.ts` (createAccountSchema: name required non-empty max 255, type enum CHECKING/CREDIT/SAVINGS; updateAccountSchema: all fields optional with same validation)
- [x] T009 [P] Create source Zod validation schemas in `app/lib/schemas/source.ts` (createSourceSchema: name required non-empty max 255, type enum EMAIL/CSV/API/MANUAL, identifier required non-empty max 500, account_id required UUID; updateSourceSchema: all fields optional with same validation)

**Checkpoint**: Schema migrated, Prisma client regenerated, API helpers and validation schemas ready

---

## Phase 3: User Story 1 — Manage Bank Accounts (Priority: P1) 🎯 MVP

**Goal**: Full CRUD for bank accounts via REST API — create, list, get, update, delete with validation and referential integrity protection

**Independent Test**: Create an account via POST, list via GET, update via PATCH, delete via DELETE. Verify 409 when deleting account with linked sources. Verify 400 with per-field errors on invalid input.

### Implementation for User Story 1

- [x] T010 [US1] Implement `GET` (list all) and `POST` (create) route handlers in `app/app/api/accounts/route.ts` — POST validates with createAccountSchema, returns 201 with envelope; GET returns array with envelope
- [x] T011 [US1] Implement `GET` (single), `PATCH` (update), and `DELETE` route handlers in `app/app/api/accounts/[id]/route.ts` — PATCH validates with updateAccountSchema; DELETE checks source count and returns 409 if sources exist, 200 if clean; all return 404 for missing account

### Tests for User Story 1

- [x] T012 [P] [US1] Test account Zod schemas in `app/lib/schemas/account.test.ts` — valid create/update payloads pass, missing name rejects, empty name rejects, invalid type rejects, max length 255 enforced, update allows partial fields
- [x] T013 [P] [US1] Test account collection routes in `app/app/api/accounts/route.test.ts` — POST returns 201 with created account, POST with invalid body returns 400 with per-field errors, GET returns array of all accounts in envelope
- [x] T014 [US1] Test account resource routes in `app/app/api/accounts/[id]/route.test.ts` — GET returns single account or 404, PATCH updates and returns 200 or 400/404, DELETE returns 200 when no sources or 409 with count message when sources exist, DELETE returns 404 for missing account

**Checkpoint**: Account CRUD API fully functional and tested

---

## Phase 4: User Story 2 — Manage Data Sources (Priority: P1)

**Goal**: Full CRUD for data sources linked to accounts via REST API — create, list (with account names), get, update, delete with validation and uniqueness enforcement

**Independent Test**: Create a source linked to an existing account via POST, list sources via GET (verify account name included), update via PATCH, delete via DELETE. Verify 400 on missing fields, 409 on duplicate (account_id, type, identifier).

### Implementation for User Story 2

- [x] T015 [US2] Implement `GET` (list all with account include) and `POST` (create) route handlers in `app/app/api/sources/route.ts` — POST validates with createSourceSchema, verifies account exists, catches unique constraint violation (P2002) for 409; GET uses `include: { account: { select: { id, name } } }`
- [x] T016 [US2] Implement `GET` (single), `PATCH` (update), and `DELETE` route handlers in `app/app/api/sources/[id]/route.ts` — PATCH validates with updateSourceSchema, verifies account exists if account_id provided, catches unique constraint; all return 404 for missing source; responses include account info

### Tests for User Story 2

- [x] T017 [P] [US2] Test source Zod schemas in `app/lib/schemas/source.test.ts` — valid create/update payloads pass, missing required fields reject with per-field errors, invalid type rejects, invalid UUID for account_id rejects, max length enforced (name 255, identifier 500), update allows partial fields
- [x] T018 [P] [US2] Test source collection routes in `app/app/api/sources/route.test.ts` — POST returns 201 with source including account info, POST with missing fields returns 400, POST with non-existent account_id returns 400, POST with duplicate (account_id, type, identifier) returns 409, GET returns array with account `{ id, name }` included
- [x] T019 [US2] Test source resource routes in `app/app/api/sources/[id]/route.test.ts` — GET returns single source with account info or 404, PATCH updates and returns 200 with account info or 400/404/409, DELETE returns 200 or 404

**Checkpoint**: Source CRUD API fully functional and tested. Sources include linked account names.

---

## Phase 5: User Story 4 — Transaction Data Schema (Priority: P1)

**Goal**: Verify that the transaction schema from Phase 2 is correct by validating constraints — deduplication on transactions, staging status defaults, processed statement hash uniqueness

**Independent Test**: Run migration (already done in Phase 2), then verify tables exist with correct columns, constraints, and indexes by inspecting the database.

### Implementation for User Story 4

- [x] T020 [US4] Verify Prisma schema correctness: confirm Transaction `@@unique([account_id, date, amount, description_raw])` constraint, StagingTransaction `status @default(PENDING)`, ProcessedStatement `statement_hash @unique` are all present in `app/prisma/schema.prisma` and migration applied cleanly
- [x] T020b [US4] Integration test for transaction schema constraints in `app/prisma/schema.test.ts` — verify: inserting duplicate (account_id, date, amount, description_raw) does not increase row count (dedup), StagingTransaction inserts default to PENDING status, duplicate ProcessedStatement.statement_hash is rejected. Runs against real finance_test database.

**Checkpoint**: All three new tables exist with correct constraints, verified at runtime. Schema is ready for future ingestion pipeline (EPIC-03+).

---

## Phase 6: User Story 3 — Source Management UI (Priority: P2)

**Goal**: Sources page in the dashboard with inline account management and source creation/listing — a visual interface over the APIs built in Phases 3–4

**Independent Test**: Navigate to `/sources`, create an account inline, create a source via the form, verify both appear in their lists without page reload.

### Implementation for User Story 3

- [x] T021 [P] [US3] Create `AccountList` component in `app/components/AccountList.tsx` — client component with account list display, inline add form (name + type dropdown), edit/delete actions, calls `/api/accounts` endpoints, loading/empty/error states per constitution VIII
- [x] T022 [P] [US3] Create `SourceList` component in `app/components/SourceList.tsx` — client component with source list (showing account names), creation form (name, type dropdown, identifier, account dropdown), delete action, calls `/api/sources` endpoints, loading/empty/error states
- [x] T023 [US3] Implement Sources page in `app/app/(dashboard)/sources/page.tsx` — client component composing `AccountList` and `SourceList`, fetches accounts on mount for the source form's account dropdown, re-fetches after mutations, pt-BR labels

**Checkpoint**: Sources page fully functional at `/sources` — user can manage accounts and sources visually

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, and verification across all stories

- [x] T024 Run quickstart.md verification checklist — confirm migration, all CRUD endpoints, UI, and response envelope consistency
- [x] T025 Update `CLAUDE.md` "Recent Changes" and "Active Technologies" sections to reflect 002-data-model-sources additions (Zod, Vitest)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (Zod installed for schemas). T005/T006 (schema + migration) BLOCK all user stories. T007–T009 can run in parallel after T001.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (needs api.ts helpers, account schemas, and migrated schema). Tests (T012–T014) run after implementation (T010–T011).
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion (needs api.ts helpers, source schemas). Tests (T017–T019) run after implementation (T015–T016). Does NOT depend on US1.
- **User Story 4 (Phase 5)**: Depends on Phase 2 (T005/T006 migration). No dependency on US1 or US2 — pure schema verification.
- **User Story 3 (Phase 6)**: Depends on US1 (Phase 3) and US2 (Phase 4) — the UI calls the API endpoints built in those phases
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Accounts API)**: Requires Phase 2 only — independently testable
- **US2 (Sources API)**: Requires Phase 2 only — independently testable
- **US4 (Transaction Schema)**: Requires Phase 2 only — schema verification
- **US3 (Sources UI)**: Requires US1 + US2 — UI layer on top of APIs

### Within Each User Story

- Validation schemas (Phase 2) before route handlers
- Collection routes before individual resource routes
- Implementation before tests (tests validate the implementation)
- API endpoints (US1, US2) before UI (US3)

### Parallel Opportunities

- T003 and T004 can run in parallel (Setup phase)
- T007, T008, and T009 can run in parallel (Foundational phase — different files)
- US1 (Phase 3) and US2 (Phase 4) can run in parallel after Phase 2 (independent APIs)
- US4 (Phase 5) can run in parallel with US1 and US2 (schema verification only)
- T012 and T013 can run in parallel (US1 test files — schema tests vs route tests)
- T017 and T018 can run in parallel (US2 test files — schema tests vs route tests)
- T021 and T022 can run in parallel (US3 component files)

---

## Parallel Example: Foundational Phase

```bash
# After T001 (Zod installed) and T005/T006 (migration), launch in parallel:
Task T007: "Create API response envelope helpers in app/lib/api.ts"
Task T008: "Create account Zod schemas in app/lib/schemas/account.ts"
Task T009: "Create source Zod schemas in app/lib/schemas/source.ts"
```

## Parallel Example: User Stories 1, 2, and 4

```bash
# After Phase 2 complete, launch in parallel:
Task T010+T011 then T012+T013+T014: "Account CRUD API + tests (US1)"
Task T015+T016 then T017+T018+T019: "Source CRUD API + tests (US2)"
Task T020: "Transaction schema verification (US4)"
```

## Parallel Example: US1 Tests

```bash
# After T010+T011 (account routes implemented), launch in parallel:
Task T012: "Test account Zod schemas in app/lib/schemas/account.test.ts"
Task T013: "Test account collection routes in app/app/api/accounts/route.test.ts"
# Then sequentially (depends on both route files):
Task T014: "Test account resource routes in app/app/api/accounts/[id]/route.test.ts"
```

## Parallel Example: User Story 3 Components

```bash
# After US1 and US2 APIs complete, launch in parallel:
Task T021: "AccountList component in app/components/AccountList.tsx"
Task T022: "SourceList component in app/components/SourceList.tsx"
# Then sequentially:
Task T023: "Sources page composing both components"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 4)

1. Complete Phase 1: Setup (install deps, configure Vitest)
2. Complete Phase 2: Foundational (schema migration, API helpers, Zod schemas)
3. Complete Phase 3: US1 — Account CRUD API + tests
4. Complete Phase 4: US2 — Source CRUD API + tests
5. Complete Phase 5: US4 — Verify transaction schema
6. **STOP and VALIDATE**: Run `npx vitest run` — all tests green. Test APIs with curl from quickstart.md.
7. Deploy if backend-only is sufficient

### Full Delivery (Add UI)

8. Complete Phase 6: US3 — Sources management page
9. Complete Phase 7: Polish and quickstart verification
10. Full feature delivered

### Incremental Delivery

1. Setup + Foundational → Schema and helpers ready
2. Add US1 (Account API + tests) → Test independently → Usable via curl/n8n
3. Add US2 (Source API + tests) → Test independently → Full API layer complete
4. Add US4 (Schema verification) → Confirm data layer ready for EPIC-03
5. Add US3 (Sources UI) → Test independently → Visual management interface
6. Polish → Verified, documented, production-ready

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- US4 has no route handlers or UI — it's a pure data-layer story (schema + constraints)
- US3 depends on US1 + US2 because the UI calls the APIs
- All API endpoints use `Response.json()` (Web Standard) not `NextResponse.json()` per research.md decision 3
- Next.js 15 breaking change: route handler `params` is a `Promise` — must `await params` per research.md decision 2
- Amount convention: negative = debit, positive = credit (BRL only)
- Prisma import: use `@/lib/prisma` singleton in all app code
