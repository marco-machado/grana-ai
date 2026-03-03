# Quickstart: Data Model & Source Management

**Feature**: 002-data-model-sources
**Date**: 2026-03-02

## Prerequisites

- Docker Compose running: `docker compose up`
- `.env` configured (copy from `env.example` if needed)
- Database migrated and seeded (EPIC-01 baseline)

## Database Migration

Run from the app container:

```bash
docker compose exec app npx prisma migrate dev --name add_transactions_staging
docker compose exec app npx prisma generate
```

Verify new tables exist:

```bash
docker compose exec db psql -U finance -d finance -c "\dt"
```

Expected new tables: `Transaction`, `StagingTransaction`, `ProcessedStatement`

## Testing the APIs

### Account CRUD

```bash
# Create an account
curl -s -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Nubank", "type": "CHECKING"}' | jq

# List all accounts
curl -s http://localhost:3000/api/accounts | jq

# Get a specific account (replace UUID)
curl -s http://localhost:3000/api/accounts/<account-id> | jq

# Update an account
curl -s -X PATCH http://localhost:3000/api/accounts/<account-id> \
  -H "Content-Type: application/json" \
  -d '{"name": "Nubank Conta Corrente"}' | jq

# Delete an account (only works if no sources linked)
curl -s -X DELETE http://localhost:3000/api/accounts/<account-id> | jq
```

### Source CRUD

```bash
# Create a source (requires existing account ID)
curl -s -X POST http://localhost:3000/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nubank Email",
    "type": "EMAIL",
    "identifier": "statements@nubank.com.br",
    "account_id": "<account-id>"
  }' | jq

# List all sources (includes account names)
curl -s http://localhost:3000/api/sources | jq

# Update a source
curl -s -X PATCH http://localhost:3000/api/sources/<source-id> \
  -H "Content-Type: application/json" \
  -d '{"identifier": "new@nubank.com.br"}' | jq

# Delete a source
curl -s -X DELETE http://localhost:3000/api/sources/<source-id> | jq
```

### Validation Errors

```bash
# Missing required fields → 400 with per-field errors
curl -s -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{}' | jq

# Invalid account type → 400
curl -s -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "type": "INVALID"}' | jq

# Delete account with sources → 409
curl -s -X DELETE http://localhost:3000/api/accounts/<account-with-sources-id> | jq
```

## Running Tests

```bash
# Run all tests (single-run mode — never use watch mode)
cd app && npx vitest run

# Run specific test file
cd app && npx vitest run __tests__/api/accounts.test.ts

# Run with coverage
cd app && npx vitest run --coverage
```

## Accessing the UI

Navigate to http://localhost:3000/sources

The Sources page provides:
- **Account section**: List of accounts with inline add form
- **Source section**: List of sources (with account names) and source creation form

## Verification Checklist

- [ ] Migration applies without errors
- [ ] `Transaction`, `StagingTransaction`, `ProcessedStatement` tables created
- [ ] Account CRUD endpoints return consistent `{ data, error }` envelope
- [ ] Source CRUD endpoints return consistent `{ data, error }` envelope
- [ ] Source list includes account names
- [ ] Deleting account with sources returns 409
- [ ] Validation errors return per-field messages
- [ ] Sources page loads with both sections
- [ ] All tests pass in single-run mode
