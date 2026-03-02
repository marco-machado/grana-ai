# Quickstart: Grana AI

## Prerequisites

- Docker and Docker Compose v2.22+ installed
- Git

## Setup (< 5 minutes)

### 1. Clone and configure

```bash
git clone <repository-url>
cd grana_ai
cp env.example .env
```

Edit `.env` and fill in required values:
- `POSTGRES_USER` / `POSTGRES_PASSWORD` — database credentials
- `N8N_ENCRYPTION_KEY` — generate with `openssl rand -hex 32`
- `ANTHROPIC_API_KEY` — your Anthropic API key (not needed for scaffold)

### 2. Start all services

```bash
docker compose up
```

This command:
1. Builds the Next.js app container (first run takes ~2 minutes)
2. Starts PostgreSQL 17
3. Applies the database schema automatically (`prisma db push`)
4. Seeds category reference data (45 categories: 10 parents + 35 children)
5. Starts n8n and Metabase

### 3. Verify

| Service | URL | Expected |
|---------|-----|----------|
| Next.js app | http://localhost:3000 | Dashboard with sidebar navigation |
| n8n | http://localhost:5678 | n8n setup wizard |
| Metabase | http://localhost:3001 | Metabase setup wizard |

### 4. Navigate the dashboard

The sidebar contains links to all sections:
- Overview (`/`)
- Transactions (`/transactions`)
- Budgets (`/budgets`)
- Recurring (`/recurring`)
- Installments (`/installments`)
- Goals (`/goals`)
- Sources (`/sources`)
- Insights (`/insights`)

All pages render with their section title. No broken links.

## Development

### File syncing (hot reload)

```bash
docker compose watch
```

Changes to files in `app/` are synced into the running container. Next.js hot-reloads automatically.

### Database operations

```bash
# Open Prisma Studio (visual DB browser)
docker compose exec app npx prisma studio

# Re-push schema after changes
docker compose exec app npx prisma db push

# Re-seed categories
docker compose exec app npx prisma db seed

# Connect to PostgreSQL directly
docker compose exec postgres psql -U $POSTGRES_USER -d finance
```

### Verify seed data

```sql
-- Top-level categories (10)
SELECT count(*) FROM "Category" WHERE "parent_id" IS NULL;

-- Subcategories (35)
SELECT count(*) FROM "Category" WHERE "parent_id" IS NOT NULL;

-- All categories with hierarchy
SELECT p.name AS parent, c.name AS child
FROM "Category" c
JOIN "Category" p ON c."parent_id" = p.id
ORDER BY p.name, c.name;
```

## Stopping

```bash
docker compose down          # Stop services, keep data
docker compose down -v       # Stop services and delete volumes (data loss)
```
