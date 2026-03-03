# Feature Specification: Statement Processing Pipeline

**Feature Branch**: `003-statement-processing`
**Created**: 2026-03-02
**Status**: Draft
**Input**: EPIC-03 — Build the core processing endpoint that receives raw bank statement content, parses it with Claude API, deduplicates against previously processed statements, and inserts parsed transactions into the staging table. Includes a manual upload UI for testing the pipeline without n8n.

## Clarifications

### Session 2026-03-02

- Q: Should the AI's category suggestion map to existing Category table names, return free-text, or both? → A: AI maps to existing Category names (the 45-category taxonomy is included in the AI prompt context).
- Q: Who is responsible for extracting text from uploaded PDF files? → A: The upload page extracts text from PDFs client-side; the processing endpoint only receives plain text.
- Q: How should the system handle AI provider rate limiting, especially during batch mode? → A: Automatic retry with exponential backoff (up to 3 attempts per chunk), then fail with descriptive error.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Process a Single Bank Statement (Priority: P1)

The user submits raw bank statement text (from any Brazilian bank: Nubank, Itau, Bradesco, Inter, etc.) to the processing endpoint. The system hashes the content for deduplication, sends it to an AI model for parsing, extracts structured transactions (date, raw description, clean description, amount, category suggestion), and inserts them into the staging area with a PENDING status. The system records the statement hash so it won't be reprocessed.

**Why this priority**: This is the core pipeline — without it, no statements get parsed. Every other feature depends on this working correctly.

**Independent Test**: Submit raw statement text via the processing endpoint and verify that structured transactions appear in the staging area with correct fields and PENDING status.

**Acceptance Scenarios**:

1. **Given** valid bank statement text and a valid account/source pair, **When** the user submits it for processing, **Then** the system returns a list of parsed transactions with date, raw description, clean description, amount (negative=debit, positive=credit), and category suggestion for each line item.
2. **Given** valid bank statement text, **When** processing completes, **Then** all parsed transactions appear in the staging area with status PENDING and a reference to the originating account.
3. **Given** a statement with mixed debits and credits, **When** parsed, **Then** debits have negative amounts and credits have positive amounts.
4. **Given** a statement from a specific bank (e.g., Nubank), **When** the source context is provided, **Then** the AI adapts its parsing to that bank's known statement format.

---

### User Story 2 - Deduplication of Previously Processed Statements (Priority: P1)

When the same bank statement content is submitted more than once (whether via manual upload or automated ingestion), the system recognizes it has already been processed and skips re-parsing. This prevents duplicate transactions from entering the staging area.

**Why this priority**: Without deduplication, the system would create duplicate transactions every time a statement is re-sent, making financial data unreliable. This is equally critical as parsing itself.

**Independent Test**: Submit the same statement content twice and verify the second submission returns an "already processed" response without creating new staging transactions.

**Acceptance Scenarios**:

1. **Given** a statement that has already been processed for a given source, **When** the same content is submitted again for the same source, **Then** the system returns an "already processed" response without re-parsing or inserting duplicate transactions.
2. **Given** identical statement content but different sources, **When** submitted, **Then** each source processes independently (the hash is scoped per source).
3. **Given** a slightly modified version of a previously processed statement, **When** submitted, **Then** the system treats it as new content and processes it (the hash changes with any content change).

---

### User Story 3 - Manual Statement Upload via UI (Priority: P2)

The user navigates to the manual upload page, selects an account and source, and either pastes raw statement text or uploads a text/PDF file. The system sends the content to the processing endpoint and displays a result summary showing how many transactions were parsed and how many duplicates were skipped.

**Why this priority**: Provides a user-facing way to test and use the pipeline without requiring n8n setup. Essential for initial onboarding and historical backfill.

**Independent Test**: Open the upload page, select an account/source, paste statement text, click upload, and verify the result summary appears with correct counts.

**Acceptance Scenarios**:

1. **Given** the user is on the manual upload page, **When** they select an account and source from dropdown menus, paste statement text, and click upload, **Then** the system processes the statement and shows a summary (e.g., "12 transactions parsed, 0 duplicates skipped").
2. **Given** the user uploads a text file containing statement content, **When** processing completes, **Then** the result summary is displayed with the same detail as text paste.
3. **Given** a statement that was already processed, **When** the user re-uploads it, **Then** the summary indicates all items were skipped as duplicates.
4. **Given** no account or source is selected, **When** the user tries to upload, **Then** the system prevents submission and displays a validation message.

---

### User Story 4 - Batch Mode for Historical Backfill (Priority: P3)

The user submits a large historical bank statement (spanning multiple months or pages) with batch mode enabled. The system splits the content into manageable chunks, processes each chunk through the AI parser, and merges the results before inserting into the staging area.

**Why this priority**: Historical backfill is a one-time onboarding task. Important but not blocking day-to-day usage.

**Independent Test**: Submit a large multi-page statement with batch mode enabled and verify all transactions from all pages are parsed and inserted without timeout.

**Acceptance Scenarios**:

1. **Given** a large statement with batch mode enabled, **When** submitted for processing, **Then** the system chunks the content, parses each chunk, and returns the merged set of parsed transactions.
2. **Given** a batch-mode request, **When** one chunk fails to parse, **Then** the system still returns results from successful chunks and reports the failure for the problematic chunk.
3. **Given** a standard (non-batch) request with a very large statement, **When** submitted without batch mode, **Then** the system processes it as a single unit (may be slower or hit limits).

---

### User Story 5 - n8n Integration Documentation (Priority: P3)

An integration guide exists that explains how the external orchestration system (n8n) should call the processing endpoint. It covers the expected payload format, required fields, and includes an example workflow configuration.

**Why this priority**: n8n is the intended automated trigger for daily processing, but manual upload covers the same functionality in the interim. Documentation can be created alongside or after the core pipeline.

**Independent Test**: Follow the documentation to configure n8n to send a test statement to the processing endpoint and verify it succeeds.

**Acceptance Scenarios**:

1. **Given** the integration guide, **When** a developer follows the instructions to configure an external HTTP request, **Then** they can successfully submit a statement for processing.
2. **Given** the example payload in the guide, **When** sent to the processing endpoint, **Then** it is accepted and processed correctly.

---

### Edge Cases

- What happens when the submitted content is empty or contains only whitespace? The system returns a validation error without calling the AI parser.
- What happens when the AI parser returns malformed or incomplete data (missing required fields)? The system returns an error indicating which fields failed validation, and no partial transactions are inserted.
- What happens when the AI service is unavailable or returns an error? The system returns an appropriate error response (indicating an upstream service failure) with a descriptive message. The statement hash is NOT recorded, so the user can retry.
- What happens when the content exceeds the AI model's token/context limit in non-batch mode? The system returns an error suggesting the user enable batch mode for large statements.
- What happens when a referenced account or source does not exist? The system returns a validation error before any processing begins.
- What happens when the AI parser extracts a date in an unexpected format? The system normalizes dates or rejects transactions with unparseable dates, reporting them in the response.
- What happens when a PDF file is uploaded but text extraction yields no usable content? The system returns an error indicating the file could not be parsed.
- What happens when the AI provider rate-limits requests during batch processing? The system retries each throttled request with exponential backoff (up to 3 attempts). If retries are exhausted, the affected chunks fail while successful chunks still return results.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept raw bank statement text along with account and source identifiers, and return structured transaction data.
- **FR-002**: System MUST extract the following fields from each transaction line in a statement: date, raw description, cleaned description, amount (negative=debit, positive=credit), suggested category (mapped to an existing Category name from the taxonomy), and parsing confidence score.
- **FR-003**: System MUST compute a hash of the statement content and check it against previously processed records (scoped per source) before parsing.
- **FR-004**: System MUST skip re-parsing and return an "already processed" response when a duplicate hash is detected for the same source.
- **FR-005**: System MUST insert all successfully parsed transactions into the staging area with a PENDING status.
- **FR-006**: System MUST record the statement hash after successful processing to enable future deduplication.
- **FR-007**: System MUST NOT record the statement hash if processing fails, allowing the user to retry.
- **FR-008**: System MUST adapt its parsing behavior based on the source context (bank-specific formats).
- **FR-009**: System MUST validate that the referenced account and source exist before processing.
- **FR-010**: System MUST return validation errors for empty content, missing required fields, or non-existent account/source references.
- **FR-011**: System MUST return a descriptive error when the AI parsing service fails, without recording the statement as processed.
- **FR-012**: System MUST support a batch mode that chunks large statements and processes them in parallel, merging results before insertion.
- **FR-013**: System MUST provide a manual upload interface with account/source selection, text paste area, and file upload (drag-and-drop) with client-side text extraction from PDFs before submission.
- **FR-014**: System MUST display a processing result summary on the upload page showing the count of parsed transactions and skipped duplicates.
- **FR-015**: System MUST validate AI parser responses against a defined schema, rejecting malformed or incomplete data.
- **FR-016**: System MUST handle transaction-level deduplication via unique constraint on the transactions table (account_id, date, amount, description_raw) with ON CONFLICT DO NOTHING during promotion from staging. Duplicate rows in staging are permitted and resolved during human review.
- **FR-017**: System MUST automatically retry AI parsing requests that are rate-limited, using exponential backoff with up to 3 attempts per request, before returning a descriptive error to the user.

### Key Entities

- **Processed Statement**: Represents a record that a specific statement content (identified by hash) has been processed for a given source. Prevents reprocessing. Key attributes: hash, source reference, processing timestamp.
- **Staging Transaction**: A parsed transaction awaiting review/promotion. Key attributes: date, raw description, clean description, amount, suggested category (reference to existing Category name), confidence score (0–1 per transaction), processing status (PENDING), account reference, source reference.
- **Account**: The bank account the statement belongs to. Pre-existing entity.
- **Source**: The origination channel (email, CSV, manual, API) for the statement. Pre-existing entity, linked to an account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A bank statement with up to 50 transaction lines is fully parsed and staged within 30 seconds of submission.
- **SC-002**: Duplicate statement submissions are detected and rejected within 1 second, without calling the AI parser.
- **SC-003**: The AI parser correctly extracts all required fields (date, description, amount) from statements of the 4 major Brazilian banks (Nubank, Itau, Bradesco, Inter) with at least 90% accuracy per field.
- **SC-004**: Batch mode processes a statement with up to 500 transaction lines without timeout or data loss.
- **SC-005**: A user with no technical background can upload a statement via the manual upload page and see results within 1 minute, with no more than 3 clicks after reaching the page.
- **SC-006**: Zero duplicate transactions are created in the staging area when the same statement is submitted multiple times.
- **SC-007**: When the AI service is unavailable, the user receives a clear error message and can successfully retry once the service recovers.

## Assumptions

- The staging transactions table and processed statements table already exist in the database (created by EPIC-02).
- Statement content is provided as plain text (either pasted directly or extracted from files before submission). PDF text extraction is performed client-side in the upload UI before sending to the processing endpoint.
- The system runs on a private network; no authentication is required on the processing endpoint for v1.
- All amounts are in BRL. No multi-currency support is needed.
- The AI model is configured to handle Portuguese-language bank statements.
- Category suggestions from the AI parser are mapped to existing Category table names (included in the prompt). They are best-effort and will be reviewed/corrected by the user in a later workflow step.
- n8n integration documentation is informational only — n8n workflow creation/testing is outside the scope of this feature.

## Dependencies

- **EPIC-02**: Database schema for `staging_transactions` and `processed_statements` tables must be in place.
- **Anthropic Claude API**: External AI service for statement parsing. Requires a valid API key.
- **Existing Account and Source data**: At least one account and source must exist in the database for processing to work.

## Out of Scope

- Transaction review/approval workflow (promoting from staging to final transactions).
- Category management or categorization rules engine.
- Automated n8n workflow creation or testing.
- Authentication or rate limiting on the processing endpoint.
- Multi-currency support.
- OCR or PDF image extraction (only text-based PDFs or pasted text are supported).
