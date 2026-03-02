# EPIC-10: Dashboards & Metabase Integration

**Status:** Not Started
**Dependencies:** EPIC-01 through EPIC-09

## Overview

Embed Metabase charts into the Next.js app via JWT-signed iframes, transforming placeholder pages into data-rich dashboards. This epic connects the read/visualization layer (Metabase) with the write/interaction layer (Next.js) to create a unified experience.

## Deliverables

### MetabaseEmbed Component
- `app/app/components/MetabaseEmbed.tsx`:
  - Accepts Metabase question/dashboard ID and optional parameters (filters)
  - Signs the JWT payload with `METABASE_SECRET_KEY` using `jsonwebtoken`
  - Renders a responsive iframe with the signed embed URL
  - Handles loading state and error fallback
  - Supports both questions (individual charts) and dashboards (multi-chart views)

### JWT Signing Utility
- `app/lib/metabase.ts`:
  - `signEmbedUrl(payload: MetabaseEmbedPayload): string` — creates signed URL for iframe embedding
  - Payload includes resource type (question/dashboard), resource ID, and parameter filters
  - Token expiry: 10 minutes (short-lived for security)

### Metabase Question Definitions
Document the SQL/native queries to create in Metabase for embedding:

- **Overview dashboard:**
  - Net cash flow this month (income - expenses)
  - Savings rate % (savings transfers / income)
  - Top 5 spend categories (pie chart)
  - Monthly income vs expenses (bar chart)
- **Trends:**
  - Month-over-month spending by category (stacked area)
  - Income stability (line chart)
  - Spend patterns by day of week (heatmap)
- **Budget comparison:**
  - Budget vs actual by category (horizontal bar, color-coded)

### Page Integration
Update existing pages to embed Metabase charts:
- `app/app/(dashboard)/page.tsx` (Overview) — embed overview dashboard charts
- `app/app/(dashboard)/transactions/page.tsx` — add spending summary charts above transaction list
- `app/app/(dashboard)/budgets/page.tsx` — add budget comparison chart alongside form

### Setup Guide
- `app/docs/metabase-setup.md`:
  - Connecting Metabase to the `finance` database
  - Enabling embedding in Metabase Admin settings
  - Creating each question/dashboard with provided SQL
  - Finding question/dashboard IDs for the embed component
  - Setting `METABASE_SECRET_KEY` in `.env`

## Database Changes

No database changes — this epic reads from existing tables.

## Acceptance Criteria

- [ ] `MetabaseEmbed` component renders a Metabase chart via signed iframe
- [ ] JWT is signed with `METABASE_SECRET_KEY` from environment
- [ ] Embedded charts load without authentication prompts
- [ ] Overview page shows net cash flow, savings rate, and top categories
- [ ] Charts are responsive (resize with container)
- [ ] Invalid or expired JWT shows a user-friendly error message
- [ ] Setup guide covers end-to-end Metabase configuration
- [ ] Metabase question SQL definitions produce correct visualizations
- [ ] Iframe has appropriate sandbox attributes for security
- [ ] Loading state shown while chart loads

## Architecture Notes

- Metabase embedding uses signed JWTs, not full SSO. The Next.js server signs each embed URL server-side (in a Server Component or API route), so `METABASE_SECRET_KEY` never reaches the client.
- The `MetabaseEmbed` component is a Server Component that generates the signed URL and renders the iframe. No client-side JavaScript needed for signing.
- Chart parameters (date range, account filter) are passed through the JWT payload, not URL query params, to prevent tampering.
- Metabase runs on port 3001 (its internal port 3000 is mapped to 3001 in docker-compose). The embed URL uses `METABASE_URL` from env, which defaults to `http://localhost:3001`.
- This epic depends on all feature epics because the dashboards query data from all tables. However, the charts degrade gracefully with empty data — they just show "No data" messages.
