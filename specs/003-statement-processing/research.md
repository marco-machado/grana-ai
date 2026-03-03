# Research: Statement Processing Pipeline

**Feature**: 003-statement-processing
**Date**: 2026-03-02

## R-001: EPIC-02 Schema Dependency

**Decision**: Include database schema creation (Transaction, StagingTransaction, ProcessedStatement models) as a prerequisite phase within this epic.

**Rationale**: EPIC-02 has not been implemented — the current Prisma schema only contains Account, Source, and Category models. Since the staging and processed_statements tables are a hard prerequisite for the processing pipeline, and EPIC-02's schema definition is stable and well-documented, we incorporate the schema migration into this epic rather than blocking on a separate epic.

**Alternatives considered**:
- Wait for EPIC-02 completion → Rejected: would delay this epic indefinitely. EPIC-02 also includes CRUD UI for accounts/sources which is orthogonal to the processing pipeline.
- Create only the tables needed (StagingTransaction, ProcessedStatement) → Rejected: Transaction table is also needed for the unique constraint dedup pattern, and it's trivial to add. Doing it now keeps the schema consistent.

**What we include from EPIC-02**: Prisma models (Transaction, StagingTransaction, ProcessedStatement, StagingStatus enum), migration, and the Zod validation library dependency. **What we defer**: Account/Source CRUD API routes and UI — those belong to EPIC-02 proper.

---

## R-002: Anthropic SDK for Structured Output

**Decision**: Use `@anthropic-ai/sdk` with `zodOutputFormat` and `client.messages.parse()` for structured transaction extraction.

**Rationale**: The `zodOutputFormat` approach constrains the model at the API level to produce valid JSON matching a Zod schema. The response's `parsed_output` field is already validated. This eliminates the need for a separate tool_use round-trip and provides full TypeScript type inference.

**Alternatives considered**:
- `tool_use` with forced tool choice → Rejected: requires manual parsing of tool_use blocks and separate Zod validation. More code for the same result.
- Raw JSON output with manual parsing → Rejected: no schema enforcement at the API level, higher risk of malformed responses.

**Model**: `claude-sonnet-4-5-20250929` — best cost/quality balance for structured extraction. At ~$0.0005 per 50-line statement, annual cost for daily processing is negligible (<$0.20/year).

**Rate limiting**: SDK has built-in exponential backoff. Configure `maxRetries: 2` (1 initial + 2 retries = 3 total attempts per FR-017).

**Dependencies**: `@anthropic-ai/sdk`, `zod`

---

## R-003: Client-Side PDF Text Extraction

**Decision**: Use `unpdf` with dynamic `import()` for client-side PDF text extraction.

**Rationale**: `unpdf` is purpose-built for text extraction (1.7 MB unpacked) versus `pdfjs-dist` (38.7 MB) which includes full rendering, viewer, and worker infrastructure. `unpdf` ships a serverless PDF.js build with the worker inlined — no worker file management, no `next.config.ts` changes, no SSR issues.

**Alternatives considered**:
- `pdfjs-dist` → Rejected: 22x larger, requires worker file configuration, has documented issues with Next.js App Router (vercel/next.js#58313), and Turbopack incompatibility.
- `react-pdf` → Rejected: wraps `pdfjs-dist` for rendering, not extraction. Wrong tool for the job.

**Usage pattern**: Dynamic `import("unpdf")` inside event handler to avoid SSR and keep initial bundle clean. Call `getDocumentProxy()` + `extractText()` with `mergePages: true`.

**Dependencies**: `unpdf`

---

## R-004: Chunking Strategy for Batch Mode

**Decision**: Split large statement text by detecting natural page/section boundaries, falling back to line-count splits of ~50 lines per chunk. Process chunks with `Promise.allSettled` and merge results.

**Rationale**: Bank statements have natural page boundaries (page headers, footers, "Page X of Y" markers). Splitting on these preserves transaction context. The 50-line fallback ensures chunks stay within Claude's optimal context window for extraction accuracy while remaining well under token limits.

**Alternatives considered**:
- Fixed byte-size chunks → Rejected: may split mid-transaction, losing context.
- Single API call for all content → Rejected: large statements may degrade extraction quality and risk timeouts.
- Anthropic Batch API → Deferred for future optimization: provides 50% cost reduction but has different API semantics (async polling). Not needed for v1 where batch mode is primarily about chunking for reliability, not cost.

**Merge strategy**: Concatenate transaction arrays from all successful chunks. Report failures per chunk. Dedup within merged results by `(date, amount, description_raw)` before insertion.

---

## R-005: Processing Endpoint Design

**Decision**: Next.js App Router API route at `POST /api/statements/process` for the core processing endpoint. Separate `POST /api/statements/upload` or Server Action for the upload page.

**Rationale**: An API route is the cleanest interface for both the manual upload UI and future n8n integration. n8n sends HTTP requests to API endpoints — a Server Action wouldn't be callable from n8n. The route accepts JSON with `{ content, accountId, sourceId, batchMode? }`.

**Alternatives considered**:
- Server Action only → Rejected: not callable from n8n or external systems.
- Combined upload + process route → Rejected: separation allows the upload page to handle file reading/text extraction client-side, then call the same processing endpoint that n8n will use.

---

## R-006: AI Prompt Design for Bank Statements

**Decision**: System prompt with explicit format rules, bank-specific hints, and grounded category taxonomy. User prompt provides statement text and bank name.

**Rationale**: Brazilian bank statements vary significantly across banks (Nubank, Itau, Bradesco, Inter). The system prompt must:
1. Specify date format conversion (DD/MM/YYYY → YYYY-MM-DD)
2. Specify number format conversion (1.234,56 → 1234.56)
3. Enforce sign convention (negative=debit, positive=credit)
4. Define description_raw vs description_clean semantics
5. Ground category suggestions to the exact 45-category taxonomy from the database
6. Include bank-specific parsing hints
7. Instruct to skip non-transaction lines (headers, footers, balances)

**Category injection**: Load category hierarchy from database, format as `- Parent: Child1, Child2, ...`, include in system prompt. Cache this value since it changes rarely.
