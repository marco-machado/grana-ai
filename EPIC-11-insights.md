# EPIC-11: AI Financial Insights

**Status:** Not Started
**Dependencies:** EPIC-01 through EPIC-09

## Overview

Build a chat interface where the user asks financial questions and gets AI-powered answers grounded in their actual data. The system interprets the question, queries relevant data from PostgreSQL, and sends it to Claude with appropriate context for a data-informed response.

## Deliverables

### Insights API
- `app/app/api/insights/route.ts`:
  - `POST` — accepts `{ query: string, history?: Message[] }`
  - Determines relevant data to fetch based on query intent
  - Fetches data from PostgreSQL via Prisma
  - Calls Claude with data context + user query
  - Returns streamed response

### Context Assembly Service
- `app/lib/insights-context.ts`:
  - `assembleContext(query: string): Promise<InsightContext>` — maps query intent to data fetches:
    - Spending queries → aggregate transactions by category/period
    - Budget queries → budget vs actual for relevant period
    - Goal queries → goal progress and projections
    - Recurring queries → recurring items with costs
    - Trend queries → month-over-month comparisons
    - General queries → summary of recent financial state
  - Uses keyword matching + Claude classification for intent detection
  - Returns structured data context (not raw SQL results) formatted for Claude consumption

### System Prompt
- `app/lib/insights-prompt.ts`:
  - System prompt with:
    - Schema context (table structure, relationships)
    - Financial analysis instructions (compare periods, identify outliers, suggest actions)
    - BRL formatting rules (R$ prefix, comma decimal, dot thousands)
    - User's account list and category tree (injected dynamically)
    - Instructions to cite specific numbers and transactions
    - Guardrails: stay within financial advice scope, don't hallucinate data

### Chat Component
- `app/app/components/chat/InsightsChat.tsx`:
  - Message history display (user messages + AI responses)
  - Text input with send button
  - Streaming response display (tokens appear as they arrive)
  - Suggested starter questions (e.g. "How much did I spend on food last month?", "Am I on track for my savings goals?", "What are my top 3 recurring costs?")
  - Loading indicator during response generation
  - Error handling for API failures

### Page
- `app/app/(dashboard)/insights/page.tsx` — Insights chat page:
  - Full-height chat interface
  - Conversation persists within the session (not across page reloads)
  - Starter questions shown when chat is empty

## Database Changes

No database changes — this epic reads from existing tables.

## Acceptance Criteria

- [ ] `POST /api/insights` with a spending query returns a data-informed response
- [ ] Response includes specific numbers from the user's actual transaction data
- [ ] BRL amounts are formatted correctly (R$ 1.234,56)
- [ ] Streaming response displays tokens as they arrive in the chat
- [ ] Context assembly fetches relevant data (not all data) based on query intent
- [ ] Chat component maintains conversation history within a session
- [ ] Suggested starter questions are shown on empty chat
- [ ] System prompt prevents hallucination — Claude only references data actually fetched
- [ ] Queries about goals return current progress and projections
- [ ] Queries about budgets compare budget vs actual spending
- [ ] API failure (Claude down, timeout) shows user-friendly error in chat
- [ ] Response latency is acceptable (<5s for first token with streaming)

## Architecture Notes

- The insights endpoint does NOT give Claude direct SQL access. Instead, the context assembly service pre-fetches relevant data and includes it in the prompt. This is safer (no SQL injection risk) and more predictable (bounded data size).
- Streaming uses the Anthropic SDK's streaming API. The Next.js route returns a `ReadableStream` that the client consumes via `fetch` with `response.body.getReader()`.
- Conversation history is passed back to the API on each request (stateless server). This is simpler than server-side session storage and works fine for single-user.
- Intent detection starts with keyword matching (fast, handles 80% of queries) and falls back to a cheap Claude Haiku call for ambiguous queries. This avoids calling the full Claude model just to classify intent.
- The context window budget: system prompt (~2K tokens) + data context (~4K tokens max) + conversation history (~2K tokens) + response (~2K tokens). This leaves plenty of room within Claude's context window.
- Future enhancement: tool use / function calling to let Claude request additional data mid-response. Not in scope for this epic.
