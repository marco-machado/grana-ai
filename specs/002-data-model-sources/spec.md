# Feature Specification: Data Model & Source Management

**Feature Branch**: `002-data-model-sources`
**Created**: 2026-03-02
**Status**: Draft
**Input**: EPIC-02 — Extend database with transaction/staging schemas and build CRUD for bank accounts and data sources.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Bank Accounts (Priority: P1)

As the sole user, I need to create, view, edit, and delete bank accounts so that I can organize my finances by account (e.g., checking, credit, savings). Accounts are the top-level entity that all transactions and sources link to.

**Why this priority**: Accounts are the foundational entity — sources, transactions, and all downstream processing depend on accounts existing first. Nothing else works without this.

**Independent Test**: Can be fully tested by creating an account via the API, listing it, updating its name, and deleting it. Delivers the ability to register all bank accounts the user holds.

**Acceptance Scenarios**:

1. **Given** no accounts exist, **When** I create an account with name "Nubank" and type "CHECKING", **Then** the system returns the created account with a generated ID and status 201.
2. **Given** one or more accounts exist, **When** I request the account list, **Then** the system returns all accounts.
3. **Given** an account exists, **When** I update its name to "Nubank Conta Corrente", **Then** the system returns the updated account.
4. **Given** an account has no linked sources, **When** I delete it, **Then** the account is removed and no longer appears in listings.
5. **Given** an account has linked sources, **When** I attempt to delete it, **Then** the system rejects the deletion and informs me that sources still reference it.

---

### User Story 2 - Manage Data Sources (Priority: P1)

As the sole user, I need to create, view, edit, and delete data sources linked to my accounts so that I can define where bank statements come from (email, CSV upload, API, or manual entry). Each source belongs to exactly one account.

**Why this priority**: Sources are the second foundational entity — the ingestion pipeline (later epics) reads from sources to know which statements to process and where to store them. Co-equal priority with accounts because both are needed for the system to function.

**Independent Test**: Can be fully tested by creating a source linked to an existing account, listing sources with their account names, updating the source, and deleting it. Delivers the ability to configure all ingestion endpoints.

**Acceptance Scenarios**:

1. **Given** an account exists, **When** I create a source with name "Nubank Email", type "EMAIL", identifier "statements@nubank.com.br", linked to that account, **Then** the system returns the created source with status 201.
2. **Given** sources exist, **When** I list all sources, **Then** each source includes its linked account name.
3. **Given** a source exists, **When** I update its identifier, **Then** the system returns the updated source.
4. **Given** a source exists, **When** I delete it, **Then** the source is removed.
5. **Given** I attempt to create a source with missing required fields, **When** I submit the request, **Then** the system rejects it with descriptive validation errors for each invalid field.

---

### User Story 3 - Source Management UI (Priority: P2)

As the sole user, I need a Sources page in the dashboard where I can manage both accounts and sources in one place, so that I don't have to use raw API calls to configure my setup.

**Why this priority**: The UI makes the system usable beyond API-only interaction. It's P2 because the APIs (P1) deliver the core capability; the UI is the convenience layer.

**Independent Test**: Can be tested by navigating to the Sources page, creating an account inline, then creating a source via the form, and verifying both appear in their respective list sections. Delivers a visual management interface.

**Acceptance Scenarios**:

1. **Given** I navigate to the Sources page, **When** the page loads, **Then** I see an account list section and a source list section.
2. **Given** I am on the Sources page, **When** I fill out the inline account form and submit, **Then** a new account appears in the account list without a full page reload.
3. **Given** accounts exist, **When** I open the source creation form, **Then** I can select an account from a dropdown, fill in name, type, and identifier, and submit.
4. **Given** I submit the source form with invalid data, **When** validation runs, **Then** I see descriptive error messages on the relevant fields.
5. **Given** sources exist, **When** I view the source list, **Then** each source displays its linked account name.

---

### User Story 4 - Transaction Data Schema (Priority: P1)

As a system preparing for transaction ingestion (later epics), the database must have the correct tables to store transactions, staging transactions, and processed statement records. This is a data-layer story with no direct user interaction.

**Why this priority**: The transaction tables are the destination for all ingested data. Without them, the ingestion pipeline (EPIC-03+) has nowhere to write. Co-equal P1 because the schema must exist before any data flows.

**Independent Test**: Can be tested by running the database migration and verifying that the transactions, staging_transactions, and processed_statements tables exist with the correct columns, constraints, and indexes.

**Acceptance Scenarios**:

1. **Given** the EPIC-01 database schema exists, **When** the new migration runs, **Then** it applies cleanly without errors.
2. **Given** the transactions table exists, **When** I attempt to insert two rows with the same account, date, amount, and raw description, **Then** the second insert is silently ignored (deduplication constraint).
3. **Given** the staging_transactions table exists, **When** I insert a row, **Then** it stores category suggestion, confidence score, status (PENDING by default), and statement hash alongside core transaction fields.
4. **Given** the processed_statements table exists, **When** I insert a record, **Then** it enforces uniqueness on the statement hash.

---

### Edge Cases

- What happens when the user tries to delete an account that has sources linked to it? The system must reject the deletion with a clear error message.
- What happens when validation fails on multiple fields simultaneously? All field errors must be returned in a single response, not one at a time.
- What happens when the user submits a source with a duplicate (account_id, type, identifier) combination? The system must reject it with a descriptive error about the uniqueness constraint.
- What happens when a transaction insert violates the deduplication constraint? The insert is silently skipped (ON CONFLICT DO NOTHING behavior).
- What happens when the user tries to create a source for a non-existent account? The system must return a clear "account not found" error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow creating a bank account with a name and type (checking, credit, or savings).
- **FR-002**: System MUST allow listing all bank accounts.
- **FR-003**: System MUST allow updating an account's name and type.
- **FR-004**: System MUST prevent deleting an account that has linked sources, returning a descriptive error.
- **FR-005**: System MUST allow deleting an account that has no linked sources.
- **FR-006**: System MUST allow creating a data source with name, type (email, CSV, API, manual), identifier, and a linked account.
- **FR-007**: System MUST allow listing all sources with their linked account names.
- **FR-008**: System MUST allow updating a source's name, type, identifier, or linked account.
- **FR-009**: System MUST allow deleting a source.
- **FR-010**: System MUST validate all input payloads and return descriptive error messages for invalid data, returning all validation errors at once.
- **FR-011**: System MUST return consistent response shapes from all endpoints (data, error, and status fields).
- **FR-012**: System MUST store transactions with: date, raw description, clean description, amount (decimal), linked account, linked source, optional category, and timestamps.
- **FR-013**: System MUST enforce a deduplication constraint on transactions using (account, date, amount, raw description), silently skipping duplicates on insert.
- **FR-014**: System MUST store staging transactions with all core transaction fields (including optional category link) plus: category suggestion, confidence score (0-1), review status (pending/approved/rejected), and statement hash.
- **FR-015**: System MUST store processed statement records with source reference, unique statement hash, and processing timestamp.
- **FR-016**: System MUST provide a Sources management page with an account list section and a source list section.
- **FR-017**: System MUST provide inline add/edit forms for accounts on the Sources page.
- **FR-018**: System MUST provide a source form component with fields for name, type dropdown, identifier, and account selection.

### Key Entities

- **Account**: Represents a bank account the user holds. Has a name and type (checking, credit, savings). Top-level entity that sources and transactions link to.
- **Source**: Represents an ingestion endpoint for bank statements. Belongs to exactly one account. Has a name, type (email, CSV, API, manual), and an identifier whose meaning varies by type (email address, file pattern, endpoint URL, or freeform label).
- **Transaction**: A confirmed financial record. Has date, raw and clean descriptions, decimal amount (negative=debit, positive=credit), and links to an account, source, and optional category. Deduplicated by (account, date, amount, raw description).
- **Staging Transaction**: A transaction pending human review. Mirrors Transaction fields (including optional category link) plus AI-generated category suggestion, confidence score (0-1), review status (pending/approved/rejected), and statement hash linking it back to the source statement.
- **Processed Statement**: Tracks which statements have already been processed. Links to a source and stores a unique statement hash to prevent reprocessing.
- **Staging Status**: An enumeration of review states: pending (awaiting review), approved (promoted to transactions), rejected (discarded).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User can create, list, update, and delete bank accounts through the system without errors in under 30 seconds per operation.
- **SC-002**: User can create, list, update, and delete data sources linked to accounts without errors in under 30 seconds per operation.
- **SC-003**: All invalid input is rejected with descriptive, per-field error messages — user can correct mistakes on the first retry in 100% of cases.
- **SC-004**: The Sources page displays both account and source management sections, with each source showing its linked account name.
- **SC-005**: Duplicate transaction inserts are silently ignored, ensuring no duplicate financial records exist regardless of how many times the same data is submitted.
- **SC-006**: Database migration applies on top of the existing schema without data loss or manual intervention.
- **SC-007**: Deletion of an account that has sources is blocked with a clear explanation, preventing accidental data orphaning 100% of the time.

## Assumptions

- This is a single-user system; no multi-user access control is needed.
- All monetary amounts use BRL and are stored as decimal values (negative=debit, positive=credit).
- The transaction schema includes only core fields; feature-specific columns (recurring flags, installment groups, savings transfers) are added by later epics via incremental migrations.
- Source "identifier" stores different values based on type: sender email for EMAIL, file glob for CSV, endpoint URL for API, freeform label for MANUAL.
- The staging transaction table does not need a unique constraint since duplicates are resolved during the human review/promotion process.

## Dependencies

- EPIC-01 (Project Scaffold) must be complete — this feature builds on the existing Account, Source, and Category schema.
