# Research: Data Model & Source Management

**Feature**: 002-data-model-sources
**Date**: 2026-03-02

## Decisions

### 1. Validation Library

- **Decision**: Zod
- **Rationale**: TypeScript-first runtime validation with automatic type inference. Eliminates manual validation boilerplate while providing descriptive per-field error messages (FR-010). Widely adopted in the Next.js ecosystem. Lightweight (~57kB minified).
- **Alternatives considered**:
  - Manual validation: Verbose, error-prone, no type inference from schemas
  - Yup: Less TypeScript-native, weaker type inference
  - Joi: Node.js-oriented, heavier, not designed for edge runtime

### 2. API Design Pattern

- **Decision**: Next.js App Router route handlers (REST endpoints in `app/api/`)
- **Rationale**: Standard Next.js pattern using exported GET, POST, PATCH, DELETE functions. Provides external accessibility for n8n and future integrations. Clean separation between data access and presentation. Route handlers are plain async functions, making them directly testable without HTTP server overhead.
- **Next.js 15 breaking change**: Route handler `params` is now a `Promise` — all handlers must `await params` before accessing dynamic segments:
  ```typescript
  export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    // ...
  }
  ```
- **Alternatives considered**:
  - Server Actions: Not accessible externally (n8n can't call them), less suitable for structured CRUD APIs
  - Separate Express/Fastify server: Breaks single-service Docker model, unnecessary complexity

### 3. API Response Envelope

- **Decision**: Consistent `{ data, error }` envelope for all endpoints
- **Rationale**: Fulfills FR-011 (consistent response shapes). Supports per-field validation errors for FR-010. HTTP status code carries status semantics (201 created, 400 validation, 404 not found, 409 conflict).
- **Shape**:
  ```typescript
  // Success
  { data: T; error: null }

  // Error
  { data: null; error: { message: string; fields?: Record<string, string[]> } }
  ```
- **Implementation**: Shared helpers in `lib/api.ts` (e.g., `ok()`, `created()`, `badRequest()`, `notFound()`, `conflict()`) ensure every route uses the same format. Use `Response.json()` (Web Standard API) instead of `NextResponse.json()` — both work in Next.js 15 but `Response.json()` has no dependency on `next/server`.
- **Alternatives considered**:
  - Raw data/error bodies without envelope: Inconsistent shapes across endpoints
  - Including `status` field in body: Redundant with HTTP status code

### 4. Prisma Migration Strategy

- **Decision**: Single migration adding StagingStatus enum, Transaction, StagingTransaction, and ProcessedStatement models
- **Rationale**: All three tables are part of the same feature scope (FR-012 through FR-015). Atomic migration ensures schema consistency. Reverse relations on existing models (Account, Source, Category) are Prisma-level metadata — they don't change the database schema.
- **Alternatives considered**:
  - Per-model migrations: Unnecessary complexity for co-dependent tables that ship together

### 5. Account Deletion Strategy

- **Decision**: Application-level check before delete (query source count, return descriptive error)
- **Rationale**: FR-004 requires a descriptive error message ("sources still reference it") when deletion is blocked. Database-level RESTRICT throws a generic constraint violation (Prisma error P2003) that would need translation anyway. Checking first provides a clear, predictable user experience.
- **Flow**: `count sources where account_id = X` → if > 0, return 409 with message → else, delete.
- **Alternatives considered**:
  - Try-catch on database RESTRICT error: Exposes database internals, harder to produce friendly messages
  - CASCADE delete: Violates spec — must block deletion, not cascade

### 6. Form Handling (P2 UI)

- **Decision**: Client component page with React controlled components and fetch API calls
- **Rationale**: The Sources page manages two small entities (accounts, sources). React `useState` + `fetch` to the REST APIs is sufficient. Data set is small (single user, ~10 accounts), so client-side state management works. No external form library needed (YAGNI).
- **Pattern**: `SourcesPage` is a client component. Fetches data on mount via `useEffect`. After mutations, re-fetches the list to stay in sync.
- **Alternatives considered**:
  - react-hook-form: Overkill for 2 simple forms with ~3 fields each
  - Server Components with router.refresh(): More complex state coordination
  - SWR/React Query: Additional dependency for minimal benefit at this scale

### 7. Testing Framework

- **Decision**: Vitest with direct route handler imports
- **Rationale**: ESM-native, fast startup, compatible with Next.js 15. Route handlers are plain async functions — import and call directly with `new Request()`, no HTTP server needed. Aligns with constitution VII (single-run mode: `npx vitest run`).
- **Test database**: Same Postgres instance, separate `finance_test` database. Tables cleaned between tests via `deleteMany()` in beforeEach.
- **Test priorities** (per constitution VII):
  1. Database operations: Verify constraints, dedup, foreign keys
  2. API routes: Verify request → response contracts
  3. Validation schemas: Verify Zod parsing rules
- **Alternatives considered**:
  - Jest: Slower startup, more configuration for ESM/TypeScript
  - Supertest with HTTP server: Unnecessary overhead when handlers are importable

### 8. Decimal Precision

- **Decision**: `Decimal(12, 2)` for monetary amounts, `Decimal(3, 2)` for confidence scores
- **Rationale**: `Decimal(12, 2)` supports amounts up to ±9,999,999,999.99 BRL — sufficient for personal finance. `Decimal(3, 2)` supports 0.00–9.99, covering the 0–1 range for confidence scores. Application-level validation (in future ingestion code) constrains confidence to 0–1. Using Decimal (not Float) for both aligns with constitution I (NUMERIC, never floating-point).
- **Alternatives considered**:
  - Float for confidence: Imprecise, violates constitution I
  - Integer cents for amounts: Requires conversion everywhere, less readable

### 9. Source-Account Relationship in API Responses

- **Decision**: Source list endpoint includes flattened account info (`account: { id, name }`)
- **Rationale**: FR-007 requires sources listed "with their linked account names." Using Prisma `include` with `select` fetches account data in a single query (no N+1), satisfying constitution IX.
- **Query pattern**:
  ```typescript
  prisma.source.findMany({
    include: { account: { select: { id: true, name: true } } }
  })
  ```
