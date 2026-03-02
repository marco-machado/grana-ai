# Feature Specification: Project Scaffold & App Shell

**Feature Branch**: `001-project-scaffold`
**Created**: 2026-03-01
**Status**: Draft
**Input**: EPIC-01-scaffold.md — Bootstrap a running application with navigable dashboard shell, database ORM connected to PostgreSQL, and foundational database tables.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start the Application (Priority: P1)

As a developer setting up Grana AI for the first time, I want to run a single command and have the entire application start up, so I can begin using and developing the dashboard immediately.

**Why this priority**: Without a running application, no other feature can be built or tested. This is the absolute foundation.

**Independent Test**: Can be fully tested by running the startup command and verifying the application responds in a browser, delivering a functional development environment.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repository with environment variables configured, **When** I run the container orchestration startup command, **Then** the application service builds and starts without errors.
2. **Given** the application is running, **When** I open `http://localhost:3000` in a browser, **Then** I see the dashboard shell with sidebar navigation.
3. **Given** the application is starting up, **When** the database connection is established, **Then** the ORM applies the schema to the database successfully.

---

### User Story 2 - Navigate the Dashboard (Priority: P1)

As a user, I want to see a sidebar with navigation links to all sections of the application, so I can understand the available features and move between them without encountering errors.

**Why this priority**: The navigation shell establishes the user experience framework for all future features. Without it, users have no way to access functionality.

**Independent Test**: Can be fully tested by clicking each sidebar link and verifying that every route renders a valid page with its title.

**Acceptance Scenarios**:

1. **Given** I am on the dashboard, **When** I look at the sidebar, **Then** I see navigation links for: Overview, Transactions, Budgets, Recurring, Installments, Goals, Sources, and Insights.
2. **Given** I am on the dashboard, **When** I click any sidebar navigation link, **Then** I am taken to the corresponding page without a 404 error.
3. **Given** I am on any page, **When** I look at the page content area, **Then** I see the page title identifying which section I am viewing.

---

### User Story 3 - Seed Reference Data (Priority: P2)

As a developer, I want the database to be pre-populated with a hierarchical category taxonomy for Brazilian personal finance, so that future features like transaction categorization have reference data available immediately.

**Why this priority**: Categories are reference data needed by transaction categorization, budgets, and insights features. Seeding them now prevents blockers in subsequent work.

**Independent Test**: Can be fully tested by running the seed command and querying the database to verify category counts and hierarchy.

**Acceptance Scenarios**:

1. **Given** the database schema has been applied, **When** I run the seed command, **Then** approximately 10 top-level categories are created (Moradia, Alimentacao, Transporte, Saude, Educacao, Lazer, Servicos/Assinaturas, Vestuario, Financeiro, Renda).
2. **Given** the seed command has run, **When** I query categories without a parent, **Then** I get 10 results.
3. **Given** the seed command has run, **When** I query categories with a parent, **Then** I get 35 subcategories distributed across the top-level categories (e.g., Alimentacao has Supermercado, Restaurantes, Delivery, Padaria).

---

### User Story 4 - Access Database Client in Code (Priority: P2)

As a developer, I want a shared database client singleton available for import throughout the application, so that all future features can query the database consistently without connection leaks during development.

**Why this priority**: Every feature that reads or writes data depends on a reliable database client. The singleton pattern prevents connection exhaustion during hot-reload in development.

**Independent Test**: Can be fully tested by importing the client in a test file and executing a simple query.

**Acceptance Scenarios**:

1. **Given** the application code, **When** I import the database client from the designated path, **Then** the import resolves successfully.
2. **Given** the development server is running with hot-reload, **When** files are saved repeatedly, **Then** only one database connection pool is maintained (no connection leaks).

---

### Edge Cases

- What happens when the database is not available at startup? The application should fail with a clear error message rather than silently hanging.
- What happens when the seed command is run multiple times? It should be idempotent — running it again should not create duplicate categories.
- What happens when a user navigates to an undefined route (e.g., `/nonexistent`)? The application should show a standard not-found page.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST serve a web application accessible at `http://localhost:3000` when the container orchestration is started.
- **FR-002**: System MUST display a dashboard layout with a persistent sidebar navigation and a main content area.
- **FR-003**: Sidebar MUST contain navigation links to exactly 8 sections: Overview, Transactions, Budgets, Recurring, Installments, Goals, Sources, and Insights.
- **FR-004**: Each navigation link MUST route to a valid page that displays the section title — no broken links or 404 errors.
- **FR-005**: System MUST connect to a PostgreSQL database and apply the schema automatically.
- **FR-006**: Database MUST contain tables for accounts (with name and type), sources (with name, type, identifier, and account reference), and categories (with name and optional parent reference for hierarchy).
- **FR-007**: Account types MUST be constrained to: checking, credit, and savings.
- **FR-008**: Source types MUST be constrained to: email, CSV, API, and manual.
- **FR-009**: System MUST provide a seed mechanism that populates 10 top-level categories and 35 subcategories for Brazilian personal finance.
- **FR-010**: Category taxonomy MUST be in Portuguese (e.g., Moradia, Alimentacao, Transporte).
- **FR-011**: Seed mechanism MUST be idempotent — running it multiple times produces the same result without duplicates.
- **FR-012**: System MUST provide a database client singleton importable from a standard path, with connection pooling that survives development hot-reloads without leaking connections.
- **FR-013**: All database records MUST use UUID primary keys.
- **FR-014**: Mutable tables MUST track creation and last-update timestamps. Reference data tables MUST track creation timestamp only.
- **FR-015**: Category hierarchy MUST support exactly one level of nesting (parent to child, no deeper).
- **FR-016**: System is BRL-only. No currency field on Account — single currency is enforced by omission.

### Key Entities

- **Account**: Represents a financial account (bank checking, credit card, savings). Has a name and type (checking/credit/savings). BRL-only — no currency field.
- **Source**: Represents where transaction data comes from (email parsing, CSV upload, API sync, manual entry). Linked to an account. Has a name, type, and an identifier for the source system.
- **Category**: Represents a spending or income classification. Organized hierarchically with a parent-child relationship (one level deep). Used throughout the application for transaction categorization, budgets, and insights.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from a fresh repository clone to a running application in under 5 minutes using a single startup command.
- **SC-002**: All 8 navigation links in the sidebar are functional and render their respective pages without errors.
- **SC-003**: The database contains 10 top-level categories and 35 subcategories after seeding.
- **SC-004**: The seed process is idempotent — running it 3 consecutive times produces the same category count as running it once.
- **SC-005**: The database client can be imported and used to execute queries from any application module.
- **SC-006**: The application builds and starts reliably on repeated restarts without manual intervention.
