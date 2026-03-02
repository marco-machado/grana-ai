# Tasks: Project Scaffold & App Shell

**Input**: Design documents from `/specs/001-project-scaffold/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not in scope for this scaffold epic (per plan.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Next.js project with all configuration files and dependencies

- [x] T001 Create app/package.json with Next.js 15, React 19, Tailwind CSS 4, Prisma ORM, tsx dependencies and run npm install to generate lockfile
- [x] T002 [P] Create app/tsconfig.json with strict mode, bundler module resolution, and @/ path alias mapping to app/app/
- [x] T003 [P] Create app/next.config.ts with output: 'standalone'
- [x] T004 [P] Create app/postcss.config.mjs with @tailwindcss/postcss plugin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create app/prisma/schema.prisma with datasource, generator (output to ./generated/client), AccountType/SourceType enums, and Account/Source/Category models per data-model.md
- [x] T006 [P] Create app/app/globals.css with @import "tailwindcss" and @theme tokens for --font-sans
- [x] T007 [P] Create app/app/layout.tsx (root layout with html, body, Inter font via next/font, and metadata)
- [x] T008 Create app/Dockerfile with three-stage build (dependencies → builder → runner) on Node 22 Alpine, including prisma generate
- [x] T009 [P] Create app/.dockerignore excluding node_modules, .next, and other build artifacts
- [x] T010 Update docker-compose.yml app service: add command for startup chain (npx prisma db push && node server.js), refine develop.watch paths with ignore patterns

**Checkpoint**: Foundation ready — all project files exist, Docker builds successfully, PostgreSQL schema is applied on startup

---

## Phase 3: User Story 1 — Start the Application (Priority: P1) 🎯 MVP

**Goal**: A developer runs `docker compose up` and the app builds, starts, connects to PostgreSQL, applies the schema, and responds at `http://localhost:3000` with a visible dashboard shell

**Independent Test**: Run `docker compose up`, open `http://localhost:3000` in a browser, verify the dashboard shell with sidebar renders. Run `docker compose exec app npx prisma db push` to confirm schema is applied.

### Implementation for User Story 1

- [x] T011 [US1] Create app/components/Sidebar.tsx with navigation links to all 8 sections (Overview, Transactions, Budgets, Recurring, Installments, Goals, Sources, Insights)
- [x] T012 [US1] Create app/app/(dashboard)/layout.tsx with sidebar + main content area using Sidebar component
- [x] T013 [US1] Create app/app/(dashboard)/page.tsx (Overview page with section title)

**Checkpoint**: `docker compose up` builds and starts without errors. `http://localhost:3000` shows dashboard shell with sidebar. Database schema is applied automatically.

---

## Phase 4: User Story 2 — Navigate the Dashboard (Priority: P1)

**Goal**: All 8 sidebar links route to valid pages that display their section title — no broken links or 404 errors

**Independent Test**: Click each of the 8 sidebar links and verify every route renders a valid page with its section title. Navigate to `/nonexistent` and verify a custom 404 page appears.

### Implementation for User Story 2

- [x] T014 [P] [US2] Create app/app/(dashboard)/transactions/page.tsx with section title
- [x] T015 [P] [US2] Create app/app/(dashboard)/budgets/page.tsx with section title
- [x] T016 [P] [US2] Create app/app/(dashboard)/recurring/page.tsx with section title
- [x] T017 [P] [US2] Create app/app/(dashboard)/installments/page.tsx with section title
- [x] T018 [P] [US2] Create app/app/(dashboard)/goals/page.tsx with section title
- [x] T019 [P] [US2] Create app/app/(dashboard)/sources/page.tsx with section title
- [x] T020 [P] [US2] Create app/app/(dashboard)/insights/page.tsx with section title
- [x] T021 [US2] Create app/app/not-found.tsx (custom 404 page)

**Checkpoint**: All 8 navigation links work. Every page displays its section title. `/nonexistent` shows custom 404.

---

## Phase 5: User Story 3 — Seed Reference Data (Priority: P2)

**Goal**: Database is pre-populated with a hierarchical category taxonomy (~10 top-level, ~33 subcategories) for Brazilian personal finance in Portuguese

**Independent Test**: Run `docker compose exec app npx prisma db seed`, then query the database: `SELECT count(*) FROM "Category" WHERE "parent_id" IS NULL` returns ~10, `SELECT count(*) FROM "Category" WHERE "parent_id" IS NOT NULL` returns ~33. Run seed again to verify idempotency (same counts).

### Implementation for User Story 3

- [x] T022 [US3] Create app/prisma/seed.ts with two-pass idempotent seeding (parents first via createMany with skipDuplicates, then children) for ~43 categories per data-model.md seed taxonomy
- [x] T023 [US3] Add prisma.seed configuration to app/package.json pointing to tsx runner
- [x] T024 [US3] Update docker-compose.yml command to include seed step: npx prisma db push && npx prisma db seed && node server.js

**Checkpoint**: `docker compose up` seeds ~43 categories automatically. Running seed multiple times produces identical results (idempotent).

---

## Phase 6: User Story 4 — Access Database Client in Code (Priority: P2)

**Goal**: A shared PrismaClient singleton is importable from `@/lib/prisma` throughout the application, with connection pooling that survives dev hot-reloads

**Independent Test**: Import the client in any server component or API route and execute a simple query (e.g., `prisma.category.count()`). Save files repeatedly during dev to confirm no "too many connections" errors.

### Implementation for User Story 4

- [x] T025 [US4] Create app/lib/prisma.ts with PrismaClient singleton using globalThis pattern per research.md Decision 4

**Checkpoint**: Database client importable from `@/lib/prisma`. Development hot-reload does not leak connections.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation across all user stories

- [x] T026 Run quickstart.md validation: docker compose up from fresh state, verify all 4 services respond, navigate all 8 pages, verify seed data counts, confirm idempotent re-seed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2)
- **US2 (Phase 4)**: Depends on US1 (Phase 3) — needs sidebar and dashboard layout
- **US3 (Phase 5)**: Depends on Foundational (Phase 2) — independent of US1/US2
- **US4 (Phase 6)**: Depends on Foundational (Phase 2) — independent of US1/US2/US3
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P1)**: Depends on US1 for sidebar/layout — extends it with remaining pages
- **US3 (P2)**: Can start after Phase 2 — independent of US1/US2
- **US4 (P2)**: Can start after Phase 2 — independent of US1/US2/US3

### Within Each User Story

- Core components before dependent components (e.g., Sidebar before dashboard layout)
- Layout before pages
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T003, T004 can all run in parallel (independent config files)
- T005, T006, T007, T009 can run in parallel within Phase 2 (T008 and T010 depend on T005 for schema reference)
- T014–T020 can all run in parallel (independent page files)
- US3 and US4 can run in parallel after Phase 2 (no shared files)

---

## Parallel Example: User Story 2

```bash
# Launch all page tasks for US2 together (all [P], different files):
Task T014: "Create transactions/page.tsx"
Task T015: "Create budgets/page.tsx"
Task T016: "Create recurring/page.tsx"
Task T017: "Create installments/page.tsx"
Task T018: "Create goals/page.tsx"
Task T019: "Create sources/page.tsx"
Task T020: "Create insights/page.tsx"
# Then sequentially:
Task T021: "Create not-found.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T010)
3. Complete Phase 3: US1 (T011–T013)
4. **STOP and VALIDATE**: `docker compose up` → localhost:3000 shows dashboard with sidebar
5. This is the minimum viable scaffold — a running app with a navigable shell

### Incremental Delivery

1. Setup + Foundational → Docker builds, DB connects
2. US1 → Dashboard shell visible → **MVP!**
3. US2 → All 8 pages navigable
4. US3 + US4 (parallel) → Seed data + client singleton
5. Polish → End-to-end quickstart validation

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 26 |
| Phase 1 (Setup) | 4 tasks |
| Phase 2 (Foundational) | 6 tasks |
| Phase 3 (US1) | 3 tasks |
| Phase 4 (US2) | 8 tasks |
| Phase 5 (US3) | 3 tasks |
| Phase 6 (US4) | 1 task |
| Phase 7 (Polish) | 1 task |
| Parallel opportunities | 3 groups (config files, foundational infra, US2 pages) |
| MVP scope | Phases 1–3 (13 tasks) |
