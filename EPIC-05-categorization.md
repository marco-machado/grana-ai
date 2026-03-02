# EPIC-05: Categorization Engine

**Status:** Not Started
**Dependencies:** EPIC-02, EPIC-04

## Overview

Implement two-pass auto-categorization — keyword/pattern rules run first, then Claude fills gaps for uncategorized rows in a single batched call. Integrate this into the statement processing pipeline so new transactions arrive pre-categorized. Add category and rule management UIs.

## Deliverables

### Prisma Migration
- Add `categorization_rules` table to `schema.prisma`
- Run migration

### Rule Matching Service
- `app/lib/categorization.ts`:
  - `applyRules(transactions: StagingTransaction[]): Promise<CategorizedResult[]>` — runs all active rules against staged transactions, assigns `category_id` where rules match
  - Rule types: `KEYWORD` (substring match on description_raw/description_clean), `PATTERN` (regex match), `EXACT` (exact string match)
  - Priority ordering: higher priority rules win on conflict
  - Returns list of categorized + uncategorized transactions

### Claude Batch Categorization
- `app/lib/categorize-ai.ts`:
  - `categorizeBatch(uncategorized: StagingTransaction[], categories: Category[]): Promise<CategoryAssignment[]>`
  - Sends all uncategorized transactions + full category tree to Claude in a single API call
  - Claude returns `{ transaction_id, category_id, confidence }` for each
  - Validates response against existing category IDs

### Pipeline Integration
- Modify `POST /api/statements/process` (from EPIC-03) to run categorization after parsing:
  1. Parse statement → staging rows
  2. Apply rules → categorize matching rows
  3. Batch Claude call → categorize remaining rows
  4. Update staging rows with assigned categories

### Category CRUD API
- `app/app/api/categories/route.ts` — GET (tree structure), POST (create)
- `app/app/api/categories/[id]/route.ts` — PUT (update), DELETE (only if no transactions reference it)

### Categorization Rules CRUD API
- `app/app/api/categorization-rules/route.ts` — GET (list), POST (create)
- `app/app/api/categorization-rules/[id]/route.ts` — PUT (update), DELETE

### UI
- `app/app/(dashboard)/categories/page.tsx` — Category management:
  - Tree view showing parent → children hierarchy
  - Add/edit/delete categories (inline or modal)
  - Shows transaction count per category
- `app/app/(dashboard)/categories/rules/page.tsx` — Rule management:
  - List of rules with: pattern, type, target category, priority
  - Add/edit/delete rules
  - Test rule against sample descriptions

## Database Changes

### New Tables
| Table | Key Fields |
|-------|-----------|
| `categorization_rules` | id (UUID), name, type (enum: KEYWORD/PATTERN/EXACT), pattern (text), category_id (FK → categories), priority (int, default 0), is_active (boolean, default true), created_at, updated_at |

### New Enums
- `RuleType`: `KEYWORD`, `PATTERN`, `EXACT`

## Open Decisions Resolved

- **K (Categorization rules engine):** Resolved. Rules are stored in a database table (`categorization_rules`), not a config file. This allows runtime CRUD via the UI without deploys. Each rule has a type (keyword/pattern/exact), a text pattern, a target category, and a priority. Rules run in priority order; first match wins. Claude handles everything rules miss.

## Acceptance Criteria

- [ ] `POST /api/categorization-rules` creates a rule linked to a category
- [ ] Rule with type `KEYWORD` and pattern "uber" matches transactions containing "uber" in description
- [ ] Rule with type `PATTERN` and pattern `^PIX\s` matches transactions starting with "PIX "
- [ ] Rules run in priority order — higher priority rule wins when multiple match
- [ ] Claude batch categorization assigns categories to uncategorized transactions in a single API call
- [ ] Processing pipeline (EPIC-03 endpoint) now auto-categorizes transactions after parsing
- [ ] Category tree API returns nested parent-children structure
- [ ] Deleting a category with transactions returns 409 Conflict
- [ ] Category management page shows tree view with transaction counts
- [ ] Rule management page allows CRUD with inline testing
- [ ] `is_active: false` rules are skipped during matching

## Architecture Notes

- Categorization runs at staging time, not at promotion. This means users see Claude's category suggestions during review (EPIC-04) and can override them before approving.
- The Claude batch call sends ALL uncategorized rows in one request to minimize API calls. For large batches (>100 transactions), chunk into groups of 50 to stay within token limits.
- Rule priority is an integer where higher = more important. Default is 0. This allows users to create override rules without reordering everything.
- The `PATTERN` rule type uses JavaScript regex (`new RegExp(pattern, 'i')`) — case-insensitive by default.
