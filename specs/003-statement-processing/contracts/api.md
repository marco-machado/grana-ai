# API Contracts: Statement Processing Pipeline

**Feature**: 003-statement-processing
**Date**: 2026-03-02

## POST /api/statements/process

Core processing endpoint. Accepts raw statement text, parses it with AI, deduplicates, and inserts into staging.

### Request

```json
{
  "content": "string (required) — raw bank statement text",
  "accountId": "string (required) — UUID of the account",
  "sourceId": "string (required) — UUID of the source",
  "batchMode": "boolean (optional, default: false) — enable chunked processing for large statements"
}
```

### Response — Success (200)

```json
{
  "data": {
    "transactionCount": 12,
    "duplicatesSkipped": 0,
    "statementHash": "sha256:abc123...",
    "transactions": [
      {
        "id": "uuid",
        "date": "2026-01-15",
        "descriptionRaw": "PIX ENVIADO - JOAO SILVA",
        "descriptionClean": "PIX para João Silva",
        "amount": -150.00,
        "categorySuggestion": "Transferências",
        "confidence": 0.92,
        "status": "PENDING"
      }
    ]
  },
  "error": null
}
```

### Response — Already Processed (200)

```json
{
  "data": {
    "transactionCount": 0,
    "duplicatesSkipped": 0,
    "alreadyProcessed": true,
    "statementHash": "sha256:abc123..."
  },
  "error": null
}
```

### Response — Batch Mode Success (200)

```json
{
  "data": {
    "transactionCount": 142,
    "duplicatesSkipped": 3,
    "statementHash": "sha256:abc123...",
    "batchResults": {
      "totalChunks": 5,
      "successfulChunks": 4,
      "failedChunks": 1,
      "failures": [
        { "chunk": 3, "error": "AI rate limited after retries" }
      ]
    },
    "transactions": [ "..." ]
  },
  "error": null
}
```

### Response — Validation Error (400)

```json
{
  "data": null,
  "error": "Content is required and must not be empty"
}
```

Validation errors include:
- Empty or whitespace-only content
- Missing accountId or sourceId
- Invalid UUID format
- Non-existent account or source

### Response — AI Service Error (502)

```json
{
  "data": null,
  "error": "AI service unavailable. Please try again later."
}
```

Statement hash is NOT recorded on failure — user can retry.

### Response — Content Too Large (413)

```json
{
  "data": null,
  "error": "Statement content exceeds processing limit. Enable batch mode for large statements."
}
```

---

## GET /api/accounts

List all accounts (used by upload page dropdowns).

### Response (200)

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Nubank Credit",
      "type": "CREDIT"
    }
  ],
  "error": null
}
```

---

## GET /api/sources?accountId={uuid}

List sources filtered by account (used by upload page dropdowns).

### Response (200)

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Nubank Email",
      "type": "EMAIL",
      "identifier": "todomundo@nubank.com.br",
      "accountId": "uuid"
    }
  ],
  "error": null
}
```

---

## Internal Types

### ProcessStatementRequest (Zod schema)

```typescript
const ProcessStatementRequest = z.object({
  content: z.string().min(1).trim(),
  accountId: z.string().uuid(),
  sourceId: z.string().uuid(),
  batchMode: z.boolean().optional().default(false),
});
```

### AITransactionOutput (Zod schema — Claude response)

```typescript
const AITransactionOutput = z.object({
  transactions: z.array(
    z.object({
      date: z.string(), // YYYY-MM-DD
      description_raw: z.string(),
      description_clean: z.string(),
      amount: z.number(),
      category_suggestion: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
});
```
