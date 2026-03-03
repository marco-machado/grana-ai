# EPIC-03: Statement Processing Pipeline

**Status:** Not Started
**Dependencies:** EPIC-02

## Overview

Build the core processing endpoint that receives raw bank statement content, parses it with Claude API, deduplicates against previously processed statements, and inserts parsed transactions into the staging table. Includes a manual upload UI for testing the pipeline without n8n.

## Deliverables

### API Endpoint
- `app/app/api/statements/process/route.ts` — `POST` endpoint accepting:
  - `content`: raw statement text or extracted PDF text
  - `source_id`: UUID of the source
  - `account_id`: UUID of the account
  - `batch_mode`: optional boolean for historical backfill (larger context window, relaxed rate limiting)
- Flow: hash content → check `processed_statements` → parse with Claude → bulk insert into `staging_transactions` → record in `processed_statements`

### Claude API Service
- `app/lib/ai/client.ts` — Anthropic SDK singleton + model constant
- `app/lib/ai/schema.ts` — Zod schema for Claude structured output (zodOutputFormat)
- `app/lib/ai/parse-statement.ts` — Prompt template and AI parsing logic
- `app/lib/ai/taxonomy.ts` — Category taxonomy loader for AI prompt context

### Processing Orchestration
- `app/lib/statement-processor.ts` — Core pipeline orchestration:
  - Hash content (SHA-256), check dedup, call AI parser, validate response, resolve categories, bulk insert staging
  - Handles both single-statement and batch modes
  - Error handling for API failures, malformed responses, token limits

### Manual Upload UI
- `app/app/(dashboard)/upload/page.tsx` — Manual statement upload page:
  - Account + source selector dropdowns
  - Drag-and-drop zone for PDF/text files
  - Text area for pasting raw statement content
  - Upload button triggers `POST /api/statements/process`
  - Shows processing status and result summary (N transactions parsed, M duplicates skipped)

### n8n Integration
- `app/docs/n8n-integration.md` — Setup guide explaining:
  - How n8n should call `POST /api/statements/process` via HTTP Request node
  - Payload format and required fields
  - Authentication considerations (internal network, no auth needed for v1)
  - Example workflow JSON snippet

## Database Changes

Includes Prisma schema migration for Transaction, StagingTransaction, ProcessedStatement, and StagingStatus enum. These tables were originally scoped to EPIC-02 but are incorporated here since EPIC-02 is not yet implemented and the processing pipeline requires them. See `specs/003-statement-processing/research.md` R-001 for rationale.

## Open Decisions Resolved

- **L (Historical data ingestion):** Resolved. The same `/api/statements/process` endpoint handles both real-time and historical ingestion. `batch_mode: true` signals the endpoint to expect larger payloads and process them in chunks. First-run backlog processing: user uploads historical statements via the manual upload UI (or n8n sends them in sequence). Dedup via `processed_statements` hash ensures no double-processing.

## Acceptance Criteria

- [ ] `POST /api/statements/process` with valid statement text returns parsed transactions
- [ ] Claude API extracts date, description_raw, description_clean, amount, category_suggestion from statement text
- [ ] Sending the same statement content twice: second call returns "already processed" without re-parsing
- [ ] Parsed transactions appear in `staging_transactions` with status `PENDING`
- [ ] Invalid/empty content returns appropriate error responses
- [ ] Claude API failures return 502 with descriptive error message
- [ ] Manual upload page successfully sends content to the processing endpoint
- [ ] Upload page shows result summary after processing
- [ ] `batch_mode: true` processes larger statements without timeout

## Architecture Notes

- Processing logic lives in Next.js API routes, not n8n Code nodes. This keeps business logic testable, version-controlled, and reusable for manual uploads. n8n remains the orchestration/trigger layer.
- The Claude prompt is critical — it must handle various Brazilian bank statement formats (Nubank, Itau, Bradesco, Inter, etc.). The prompt template is parameterized with `source_id` context so Claude can adapt to known statement formats.
- Amount convention: Claude is instructed that negative = debit, positive = credit. The prompt explicitly states this.
- `batch_mode` doesn't change the logic, only the chunking strategy: large statements are split into pages/sections and parsed in parallel Claude calls, then merged.
- No authentication on the endpoint for v1 — the app runs on a private network. Can be added later via API key middleware if needed.
