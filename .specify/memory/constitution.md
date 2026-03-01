<!--
  Sync Impact Report
  ===================
  Version change: N/A → 1.0.0 (initial ratification)

  Added principles:
    - I. Data Integrity First
    - II. Two-Layer UI Separation
    - III. AI-Assisted, Human-Verified
    - IV. Idempotent Processing
    - V. Simplicity & Self-Hosting

  Added sections:
    - Technology Constraints
    - Development Workflow
    - Governance

  Removed sections: none (initial version)

  Templates requiring updates:
    - .specify/templates/plan-template.md — ✅ no update needed
      (Constitution Check section is already generic; gates will be
      derived from these principles at plan time)
    - .specify/templates/spec-template.md — ✅ no update needed
      (spec structure is feature-agnostic; no principle-driven
      mandatory sections to add)
    - .specify/templates/tasks-template.md — ✅ no update needed
      (task phases are feature-driven; constitution principles
      inform task content, not template structure)

  Follow-up TODOs: none
-->

# Grana AI Constitution

## Core Principles

### I. Data Integrity First

- Amounts MUST follow the sign convention: negative = debit,
  positive = credit. Stored as NUMERIC, never floating-point.
- Computed values (e.g., savings goal `current_amount`) MUST NOT
  be stored — they MUST be derived from source-of-truth records
  at query time.
- Transaction descriptions MUST always be split into
  `description_raw` (verbatim from statement) and
  `description_clean` (AI-normalized, human-friendly).
- Categories MUST support hierarchy via `parent_id` self-reference.
- Budgets MUST use the template-with-override pattern:
  `period = null` is the default template; `period = YYYY-MM`
  overrides for a specific month; system falls back to the latest
  template when no override exists.

### II. Two-Layer UI Separation

- **Metabase** is the read/visualization layer. It MUST NOT
  perform write operations against the database.
- **Next.js** is the write/interaction layer. It handles forms,
  transaction review, and all mutation endpoints.
- Metabase charts MUST be embedded in Next.js via signed iframes
  (`MetabaseEmbed` component) to present a unified experience.
- Both layers share the same PostgreSQL database as the single
  source of truth.

### III. AI-Assisted, Human-Verified

- Claude API MUST be used for parsing unstructured bank statements
  into structured transaction JSON.
- Claude MUST receive `source_id` and `account_id` from n8n
  before parsing — it MUST NOT guess which account it processes.
- AI-categorized transactions MUST pass through a human review
  step before promotion from the staging table to `transactions`.
- The categorization pipeline MUST run keyword/pattern rules first;
  Claude fills gaps in a single batched API call for uncategorized
  rows.

### IV. Idempotent Processing

- Statement-level deduplication: a SHA-256 hash of raw email/file
  content in `processed_statements` MUST prevent reprocessing the
  same statement.
- Transaction-level deduplication: a unique constraint on
  `(account_id, date, amount, description_raw)` with
  `ON CONFLICT DO NOTHING` MUST catch duplicates at insert time.
- The n8n workflow MUST be safe to re-run at any time without
  producing duplicate data.
- Bulk operations MUST use upsert semantics (insert with conflict
  handling), never blind inserts.

### V. Simplicity & Self-Hosting

- The system is designed for a single user. Multi-tenancy,
  authentication, and user management are explicitly out of scope.
- Currency MUST be BRL only. No multi-currency support.
- All services MUST run via a single `docker compose up` command
  with no external dependencies beyond Docker.
- YAGNI applies: features MUST NOT be built until there is a
  concrete, immediate need. Avoid speculative abstractions.
- Start simple, add complexity only when proven necessary by
  real-world usage.

## Technology Constraints

- **Database**: PostgreSQL 17, accessed via Prisma ORM from
  Next.js. Schema lives in `app/prisma/schema.prisma`.
- **Orchestration**: n8n (self-hosted) for daily email polling
  and statement processing workflows.
- **AI**: Anthropic Claude API exclusively — no other LLM
  providers.
- **Web framework**: Next.js with App Router (`app/` directory).
- **BI**: Metabase (self-hosted) for dashboards and ad-hoc
  queries.
- **Infrastructure**: Docker Compose with four services
  (PostgreSQL, n8n, Metabase, Next.js). No Kubernetes, no
  cloud-managed services.

## Development Workflow

- Changes MUST NOT be committed unless explicitly requested.
- Dev server MUST NOT be started unless explicitly requested.
- Tests MUST be run in single-run mode (`npx vitest run` or
  `npm run test:run`), never watch mode.
- Existing project conventions and patterns MUST be identified
  and followed before making changes.
- Proper error handling and graceful failure modes MUST be
  implemented at system boundaries (user input, external APIs).
- Code comments SHOULD be avoided unless the logic is too
  complex to be self-evident.
- If an implementation approach fails, stop and re-plan
  immediately rather than pushing a broken approach forward.

## Governance

- This constitution is the authoritative source of architectural
  principles for Grana AI. It supersedes ad-hoc decisions unless
  the constitution is formally amended.
- Amendments MUST be documented in this file with an updated
  version, date, and Sync Impact Report (HTML comment at top).
- Version follows semantic versioning:
  - MAJOR: principle removed or redefined incompatibly.
  - MINOR: new principle or section added, or existing guidance
    materially expanded.
  - PATCH: wording clarifications, typo fixes, non-semantic
    refinements.
- All feature specs and implementation plans SHOULD be validated
  against these principles via the Constitution Check gate in
  the plan template.
- The `CLAUDE.md` file remains the runtime development guidance
  for tooling and workflow; this constitution governs
  architectural decisions.

**Version**: 1.0.0 | **Ratified**: 2026-03-01 | **Last Amended**: 2026-03-01
