# Research: Project Scaffold & App Shell

**Feature Branch**: `001-project-scaffold`
**Date**: 2026-03-01

## Decision 1: Next.js 15 Project Setup

**Decision**: Use Next.js 15 with App Router, TypeScript strict mode, `output: 'standalone'` for Docker, `moduleResolution: "bundler"` in tsconfig.

**Rationale**:
- Next.js 15 requires React 19 and introduces async request APIs (`params`, `searchParams`, `cookies`, `headers` are all `Promise`-based now).
- Route groups `(dashboard)` let us wrap all pages in a shared sidebar layout without affecting URLs.
- `output: 'standalone'` traces dependencies and produces a minimal `server.js` + `node_modules` subset, reducing Docker image size.
- `moduleResolution: "bundler"` is the correct setting for Next.js 15 (not `"node"`).

**Alternatives considered**:
- `moduleResolution: "node"` — outdated for Next.js 15.
- `pages/` router — deprecated in favor of App Router; no reason to use for a new project.

## Decision 2: Tailwind CSS v4 (CSS-First Configuration)

**Decision**: Use Tailwind CSS v4 with CSS-first configuration (`@import "tailwindcss"` + `@theme` directive). No `tailwind.config.ts` file.

**Rationale**:
- Tailwind v4 replaced JS config with CSS-based `@theme` blocks. Design tokens (colors, fonts, spacing) are defined as CSS custom properties.
- The old `@tailwind base; @tailwind components; @tailwind utilities;` triple import is replaced by a single `@import "tailwindcss"`.
- Automatic content detection (respects `.gitignore`) — no need to specify `content` paths.
- PostCSS plugin is now `@tailwindcss/postcss` (not `tailwindcss`). Built-in `postcss-import` and `autoprefixer`.
- Requires Node.js 20+ (we use Node 22).

**Alternatives considered**:
- `tailwind.config.ts` — EPIC-01 mentions this, but it's the v3 pattern. v4 uses `@config` for legacy migration only. For a greenfield project, CSS-first is correct.
- Tailwind v3 — no reason to use an older version for a new project.

## Decision 3: Prisma Schema and Migration Strategy

**Decision**: Use `prisma db push` for the scaffold phase. Schema uses database-generated UUIDs (`gen_random_uuid()`), native PostgreSQL enums, and self-referential relation for category hierarchy.

**Rationale**:
- `db push` is ideal for rapid prototyping — no migration files generated, directly syncs schema to database.
- `gen_random_uuid()` is native to PostgreSQL 13+ (no extension needed) and works even when records are created outside Prisma (raw SQL, n8n workflows).
- `@db.Uuid` maps to PostgreSQL's native 16-byte `uuid` type instead of `text`.
- Self-referential `@relation("CategoryHierarchy")` with nullable `parent_id` supports the one-level hierarchy.
- Migration files will be generated later (`prisma migrate dev --name init`) when schema stabilizes.

**Alternatives considered**:
- `@default(uuid())` (Prisma-generated) — works only when records are created through Prisma Client. DB-generated is safer for future n8n integration.
- `prisma migrate dev` from day one — creates unnecessary migration history during rapid schema iteration.

## Decision 4: Prisma Singleton Pattern

**Decision**: Store `PrismaClient` on `globalThis` in development to survive hot-reload. Standard instantiation in production.

**Rationale**:
- Next.js dev server re-evaluates modules on every change, creating new `PrismaClient` instances that leak database connections.
- The `globalThis` pattern is the official Prisma recommendation for Next.js.
- In production, a single `PrismaClient` instance is created normally.

**Alternatives considered**:
- No global caching — leads to "too many connections" errors during development.
- Connection pooling middleware (PgBouncer) — overkill for a single-user self-hosted app.

## Decision 5: Idempotent Seeding Strategy

**Decision**: Use `createMany({ skipDuplicates: true })` with two-pass insertion (parents first, then children). Seed script runs at container startup.

**Rationale**:
- `skipDuplicates: true` silently skips rows that violate unique constraints, making the seed fully idempotent.
- Two-pass insertion ensures parent categories exist before children reference them via `parent_id`.
- Running seed at startup (chained after schema push) ensures fresh databases always have reference data.

**Alternatives considered**:
- `upsert` loop — more flexible (can update existing records) but slower and more verbose. Not needed for static reference data.
- Single `createMany` with all rows — fails if children are inserted before their parents in the same batch (FK constraint).

## Decision 6: Docker Strategy

**Decision**: Single multi-stage `Dockerfile` with `dependencies`, `builder`, and `runner` stages. Docker Compose overrides for development via `develop.watch`.

**Rationale**:
- Multi-stage build produces a minimal production image (~150-200MB vs ~1GB).
- `output: 'standalone'` in `next.config.ts` enables the standalone build.
- Development uses `docker compose watch` with file syncing — the container runs `next dev` for HMR.
- Production runs the optimized `node server.js` from the standalone output.
- Schema push + seed run at container startup via `command` override in compose.

**Alternatives considered**:
- Separate `Dockerfile.dev` — adds maintenance overhead with two files to keep in sync.
- Dev-only Dockerfile (skip multi-stage) — violates EPIC-01 spec which explicitly requests multi-stage build.

## Decision 7: Container Startup & Schema Application

**Decision**: Docker Compose `command` chains `prisma db push`, `prisma db seed`, then the app start command. PostgreSQL healthcheck ensures DB is ready.

**Rationale**:
- FR-005 requires automatic schema application — the developer should not run manual migration commands.
- `prisma db push` is safe for the scaffold phase (no migration files to manage).
- `prisma db seed` with `skipDuplicates` is safe to run on every startup.
- `depends_on` with `condition: service_healthy` prevents the app from starting before PostgreSQL accepts connections.

**Alternatives considered**:
- Init container / entrypoint script — more robust but adds complexity; not needed for a single-service app.
- Manual `prisma db push` — violates FR-005 (automatic schema application).
