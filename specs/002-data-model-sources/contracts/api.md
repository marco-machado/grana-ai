# API Contract: Data Model & Source Management

**Feature**: 002-data-model-sources
**Date**: 2026-03-02
**Base URL**: `/api`

## Response Envelope

All endpoints return a consistent JSON envelope:

```typescript
// Success (HTTP 200 or 201)
{ "data": T, "error": null }

// Error (HTTP 400, 404, 409, or 500)
{ "data": null, "error": { "message": string, "fields"?: Record<string, string[]> } }
```

- `data`: The response payload (object, array, or null on error)
- `error`: Error details (null on success)
  - `message`: Human-readable error summary
  - `fields`: Per-field validation errors (only present on 400 validation failures)

---

## Accounts API

### POST /api/accounts

Create a new bank account.

**Request**:
```json
{
  "name": "Nubank",
  "type": "CHECKING"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | yes | Non-empty, max 255 chars |
| type | string | yes | One of: CHECKING, CREDIT, SAVINGS |

**Response 201**:
```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Nubank",
    "type": "CHECKING",
    "created_at": "2026-03-02T10:00:00.000Z",
    "updated_at": "2026-03-02T10:00:00.000Z"
  },
  "error": null
}
```

**Response 400** (validation error):
```json
{
  "data": null,
  "error": {
    "message": "Validation failed",
    "fields": {
      "name": ["Name is required"],
      "type": ["Type must be one of: CHECKING, CREDIT, SAVINGS"]
    }
  }
}
```

---

### GET /api/accounts

List all bank accounts.

**Request**: No body. No query parameters.

**Response 200**:
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Nubank",
      "type": "CHECKING",
      "created_at": "2026-03-02T10:00:00.000Z",
      "updated_at": "2026-03-02T10:00:00.000Z"
    }
  ],
  "error": null
}
```

---

### GET /api/accounts/:id

Get a single account by ID.

**Response 200**: Same shape as single account object in list.

**Response 404**:
```json
{
  "data": null,
  "error": { "message": "Account not found" }
}
```

---

### PATCH /api/accounts/:id

Update an existing account. All fields optional (partial update).

**Request**:
```json
{
  "name": "Nubank Conta Corrente",
  "type": "CHECKING"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | no | Non-empty, max 255 chars (if provided) |
| type | string | no | One of: CHECKING, CREDIT, SAVINGS (if provided) |

**Response 200**: Updated account object.

**Response 400**: Validation error (same format as POST).

**Response 404**: Account not found.

---

### DELETE /api/accounts/:id

Delete an account. Blocked if sources are linked.

**Response 200**:
```json
{
  "data": { "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
  "error": null
}
```

**Response 409** (has linked sources):
```json
{
  "data": null,
  "error": {
    "message": "Cannot delete account: 3 source(s) still reference it. Remove linked sources first."
  }
}
```

**Response 404**: Account not found.

---

## Sources API

### POST /api/sources

Create a new data source linked to an account.

**Request**:
```json
{
  "name": "Nubank Email",
  "type": "EMAIL",
  "identifier": "statements@nubank.com.br",
  "account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | yes | Non-empty, max 255 chars |
| type | string | yes | One of: EMAIL, CSV, API, MANUAL |
| identifier | string | yes | Non-empty, max 500 chars |
| account_id | string | yes | Valid UUID, must reference existing account |

**Response 201**:
```json
{
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "name": "Nubank Email",
    "type": "EMAIL",
    "identifier": "statements@nubank.com.br",
    "account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "account": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Nubank"
    },
    "created_at": "2026-03-02T10:00:00.000Z",
    "updated_at": "2026-03-02T10:00:00.000Z"
  },
  "error": null
}
```

**Response 400** (validation error):
```json
{
  "data": null,
  "error": {
    "message": "Validation failed",
    "fields": {
      "name": ["Name is required"],
      "account_id": ["Account not found"]
    }
  }
}
```

**Response 409** (duplicate source):
```json
{
  "data": null,
  "error": {
    "message": "A source with this account, type, and identifier already exists"
  }
}
```

---

### GET /api/sources

List all sources with linked account info.

**Request**: No body. No query parameters.

**Response 200**:
```json
{
  "data": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "name": "Nubank Email",
      "type": "EMAIL",
      "identifier": "statements@nubank.com.br",
      "account_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "account": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "name": "Nubank"
      },
      "created_at": "2026-03-02T10:00:00.000Z",
      "updated_at": "2026-03-02T10:00:00.000Z"
    }
  ],
  "error": null
}
```

---

### GET /api/sources/:id

Get a single source by ID (includes account info).

**Response 200**: Same shape as single source object in list.

**Response 404**:
```json
{
  "data": null,
  "error": { "message": "Source not found" }
}
```

---

### PATCH /api/sources/:id

Update an existing source. All fields optional (partial update).

**Request**:
```json
{
  "name": "Nubank Email Updated",
  "type": "EMAIL",
  "identifier": "new@nubank.com.br",
  "account_id": "c3d4e5f6-a7b8-9012-cdef-345678901234"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | no | Non-empty, max 255 chars (if provided) |
| type | string | no | One of: EMAIL, CSV, API, MANUAL (if provided) |
| identifier | string | no | Non-empty, max 500 chars (if provided) |
| account_id | string | no | Valid UUID, must reference existing account (if provided) |

**Response 200**: Updated source object (includes account info).

**Response 400**: Validation error.

**Response 404**: Source not found.

**Response 409**: Duplicate constraint violation (if update creates a duplicate account_id + type + identifier).

---

### DELETE /api/sources/:id

Delete a source.

**Response 200**:
```json
{
  "data": { "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012" },
  "error": null
}
```

**Response 404**: Source not found.

---

## Error Codes Summary

| HTTP Status | Meaning | When |
|-------------|---------|------|
| 200 | Success | GET, PATCH, DELETE operations |
| 201 | Created | POST operations |
| 400 | Bad Request | Validation failures (missing/invalid fields) |
| 404 | Not Found | Entity with given ID doesn't exist |
| 409 | Conflict | Unique constraint violation or deletion blocked by references |
| 500 | Internal Server Error | Unexpected server error |

## Validation Rules

### Account

| Field | Rules |
|-------|-------|
| name | Required, string, non-empty, max 255 characters |
| type | Required, string, one of: `CHECKING`, `CREDIT`, `SAVINGS` |

### Source

| Field | Rules |
|-------|-------|
| name | Required, string, non-empty, max 255 characters |
| type | Required, string, one of: `EMAIL`, `CSV`, `API`, `MANUAL` |
| identifier | Required, string, non-empty, max 500 characters |
| account_id | Required, string, valid UUID format, must reference existing account |
