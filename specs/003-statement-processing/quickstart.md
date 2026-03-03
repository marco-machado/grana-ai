# Quickstart: Statement Processing Pipeline

**Feature**: 003-statement-processing
**Date**: 2026-03-02

## Prerequisites

1. Docker Compose running (`docker compose up`)
2. PostgreSQL accessible on port 5432
3. Valid `ANTHROPIC_API_KEY` in `.env`
4. At least one Account and Source in the database (via seed or manual creation)

## New Dependencies

```bash
cd app
npm install @anthropic-ai/sdk zod unpdf
```

## Environment Variables

Add to `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...   # Required for AI parsing
```

Add to `env.example`:

```bash
ANTHROPIC_API_KEY=             # Anthropic Claude API key for statement parsing
```

## Database Migration

After updating `app/prisma/schema.prisma` with the new models:

```bash
cd app
npx prisma migrate dev --name add-transaction-staging-models
npx prisma generate
```

## Testing the Pipeline

### Via API (curl)

```bash
curl -X POST http://localhost:3000/api/statements/process \
  -H "Content-Type: application/json" \
  -d '{
    "content": "15/01/2026 PIX ENVIADO - JOAO SILVA -150,00\n16/01/2026 PAGAMENTO RECEBIDO 3.500,00",
    "accountId": "<account-uuid>",
    "sourceId": "<source-uuid>"
  }'
```

### Via Upload Page

1. Navigate to `http://localhost:3000/upload`
2. Select account and source from dropdowns
3. Paste statement text or upload a .txt/.pdf file
4. Click "Processar"
5. View result summary

## Key Files

| File | Purpose |
|------|---------|
| `app/prisma/schema.prisma` | Database models (Transaction, StagingTransaction, ProcessedStatement) |
| `app/lib/ai/client.ts` | Anthropic SDK singleton |
| `app/lib/ai/schema.ts` | Zod schema for AI structured output |
| `app/lib/ai/parse-statement.ts` | AI parsing logic with prompt |
| `app/lib/ai/taxonomy.ts` | Category taxonomy loader for AI prompt |
| `app/lib/statement-processor.ts` | Core processing orchestration (hash, dedup, parse, insert) |
| `app/app/api/statements/process/route.ts` | Processing API endpoint |
| `app/app/(dashboard)/upload/page.tsx` | Manual upload page |
| `app/docs/n8n-integration.md` | n8n setup guide (payload format, example workflow) |

## Architecture

```
Upload Page / n8n
       ↓ POST /api/statements/process
Statement Processor
  ├── Hash content (SHA-256)
  ├── Check processed_statements (dedup)
  ├── Call AI parser (Claude API)
  ├── Validate AI response (Zod)
  ├── Resolve category suggestions → category_ids
  └── Insert staging_transactions (PENDING)
```
