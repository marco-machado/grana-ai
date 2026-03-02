<!--
  Sync Impact Report
  ===================
  Version change: 1.0.0 → 1.1.0 (MINOR — new principles added,
  governance section materially expanded)

  Added principles:
    - VI. Code Quality Standards
    - VII. Testing Discipline
    - VIII. User Experience Consistency
    - IX. Performance Requirements

  Added sections:
    - Decision Framework (under Governance)

  Modified sections:
    - Governance — expanded with decision framework, compliance
      review expectations, and principle-priority guidance

  Removed sections: none

  Templates requiring updates:
    - .specify/templates/plan-template.md — ✅ no update needed
      (Constitution Check section is generic; gates derived from
      principles at plan time. New principles VI–IX will
      automatically appear in future plan checks.)
    - .specify/templates/spec-template.md — ✅ no update needed
      (spec structure is feature-agnostic; success criteria
      already support performance/UX metrics)
    - .specify/templates/tasks-template.md — ✅ no update needed
      (testing note already present; Testing Discipline principle
      applies when tests are included per task template guidance)

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

### VI. Code Quality Standards

- TypeScript strict mode MUST be enabled. The `any` type MUST NOT
  be used — prefer `unknown` with type narrowing when the type is
  genuinely uncertain.
- Prisma imports MUST follow the project convention: generated
  client from `../prisma/generated/client/client`, app code from
  `@/lib/prisma` singleton.
- Functions and modules MUST have a single responsibility. If a
  function exceeds ~40 lines, evaluate whether it should be split.
- Dead code MUST be removed, not commented out. Version control
  is the history mechanism.
- Error handling MUST be implemented at system boundaries (API
  routes, external service calls, user input). Internal code
  SHOULD trust type contracts and avoid defensive checks against
  impossible states.
- New code MUST follow existing patterns in the codebase. When
  introducing a new pattern, document the rationale in the PR
  description or relevant design doc.
- Avoid premature abstraction: three similar lines of inline code
  are preferable to a one-use utility function.

### VII. Testing Discipline

- Tests MUST be run in single-run mode (`npx vitest run` or
  `npm run test:run`). Watch mode MUST NOT be used — it blocks
  the process indefinitely.
- Test coverage priorities (in order):
  1. Database operations and Prisma queries — verify data integrity
  2. API routes / Server Actions — verify request/response contracts
  3. Business logic functions — verify computation correctness
  4. UI components — verify critical user interactions only
- Each test MUST be independent and deterministic. Tests MUST NOT
  depend on execution order or shared mutable state.
- Database tests MUST use isolated transactions or test-specific
  schemas to prevent cross-test contamination. Seed data (from
  `prisma/seed.ts`) MAY be used as baseline state.
- Test names MUST describe the behavior being verified, not the
  implementation: prefer `"returns empty array when no transactions
  exist"` over `"test findAll method"`.
- Mocking MUST be limited to external service boundaries (Claude
  API, Gmail API, n8n webhooks). Internal modules MUST NOT be
  mocked — test through the real code path.

### VIII. User Experience Consistency

- All user-facing text MUST be in Portuguese (pt-BR), matching
  the category taxonomy language.
- Currency values MUST be formatted as BRL using `pt-BR` locale
  (`Intl.NumberFormat` or equivalent). Example: `R$ 1.234,56`.
- Dates MUST be displayed in `dd/MM/yyyy` format for Brazilian
  users. ISO format (`yyyy-MM-dd`) is reserved for API payloads
  and database storage.
- The sidebar navigation MUST remain the primary navigation
  pattern. All dashboard pages MUST be accessible from the
  sidebar without nested menus deeper than one level.
- Every page MUST handle three states: loading (skeleton or
  spinner), empty (helpful message with next action), and error
  (actionable message, never raw stack traces).
- Visual styling MUST use Tailwind CSS utility classes exclusively.
  Custom CSS MUST be limited to `globals.css` theme variables.
  No CSS modules or styled-components.
- Interactive elements MUST provide immediate visual feedback
  (hover states, disabled states during submission, success/error
  indicators).

### IX. Performance Requirements

- Page navigation within the dashboard MUST feel instant. Target:
  < 200ms for client-side route transitions (no full page reload).
- Server-rendered pages MUST return first meaningful content
  within 1 second on a local Docker network.
- Database queries MUST NOT exhibit N+1 patterns. Prisma
  `include` or `select` MUST be used to fetch related data in a
  single query.
- List views (transactions, categories, sources) MUST implement
  pagination. No endpoint SHOULD return more than 100 records in
  a single response without explicit pagination parameters.
- The Docker production image (`app/Dockerfile` runner stage)
  MUST stay under 200 MB. Multi-stage build MUST exclude dev
  dependencies and build artifacts from the final image.
- Static assets (fonts, icons) MUST be served with appropriate
  cache headers via Next.js built-in optimization.
- Metabase embeds MUST load lazily — they MUST NOT block the
  host page from becoming interactive.

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

### Authority & Amendments

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
- All feature specs and implementation plans MUST be validated
  against these principles via the Constitution Check gate in
  the plan template.
- The `CLAUDE.md` file remains the runtime development guidance
  for tooling and workflow; this constitution governs
  architectural decisions.

### Decision Framework

When a technical decision arises, principles MUST be consulted
in the following priority order:

1. **Data Integrity (I)** — never compromise correctness of
   financial data for convenience or performance.
2. **Idempotent Processing (IV)** — operations must be safe to
   retry; this takes precedence over throughput optimization.
3. **Code Quality (VI)** and **Testing Discipline (VII)** — code
   must be maintainable and verifiable before it is optimized.
4. **UX Consistency (VIII)** and **Performance (IX)** — user
   experience matters, but not at the cost of data correctness.
5. **Simplicity (V)** — when two approaches satisfy the above,
   choose the simpler one.

If two principles conflict, the higher-priority principle wins.
The conflict and resolution MUST be documented in the relevant
spec or plan file under a "Constitution Tradeoffs" heading.

### Compliance Review

- Every implementation plan MUST include a Constitution Check
  section listing which principles apply and how they are
  satisfied.
- Code reviews SHOULD verify adherence to principles VI–IX
  (Code Quality, Testing, UX, Performance) as part of standard
  review criteria.
- When a principle is intentionally violated, the deviation MUST
  be documented with rationale in the PR description or plan
  file. Undocumented violations MUST be flagged and resolved.

**Version**: 1.1.0 | **Ratified**: 2026-03-01 | **Last Amended**: 2026-03-02
