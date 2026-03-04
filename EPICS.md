# Grana AI — Epic Overview

## Dependency Graph

```
E01 Scaffold
 └─► E02 Data Model & Sources
      ├─► E03 Statement Processing
      │    └─► E04 Transaction Review
      │         ├─► E05 Categorization ──► E06 Budgets
      │         ├─► E07 Recurring      ─┐
      │         ├─► E08 Installments    ├─► E10 Dashboards
      │         └─► E09 Savings        ─┘    E11 Insights
      │
      └─► E12 Dashboard Build (Umbrella)
           12.1 Schema Extension
            ├─► 12.2 Categories API        ─┐
            ├─► 12.3 Transactions List      │
            ├─► 12.4 Transaction Review     │
            ├─► 12.5 Budgets               ├─► 12.9 MetabaseEmbed
            ├─► 12.6 Recurring              │    ├─► 12.10 Overview
            ├─► 12.7 Installments           │    └─► 12.11 Trends
            └─► 12.8 Savings Goals         ─┘
           12.12 AI Insights (after 12.1 + 12.3)
```

Epics 7, 8, 9 are parallel after Epic 4. Epics 10, 11 are parallel after all feature epics.

EPIC-12 is an independent path from E02 — issues 12.2–12.8 are parallel after 12.1.

## Epic Summary

| Epic | Name | Dependencies | Tables | Status |
|------|------|-------------|--------|--------|
| 01 | [Project Scaffold & App Shell](EPIC-01-scaffold.md) | — | accounts, sources, categories | Not Started |
| 02 | [Data Model & Source Management](EPIC-02-data-model.md) | 01 | transactions, staging_transactions, processed_statements | Not Started |
| 03 | [Statement Processing Pipeline](EPIC-03-processing.md) | 02 | — | Not Started |
| 04 | [Transaction Review & Approval](EPIC-04-review.md) | 03 | — | Not Started |
| 05 | [Categorization Engine](EPIC-05-categorization.md) | 02, 04 | categorization_rules | Not Started |
| 06 | [Budget Management](EPIC-06-budgets.md) | 01, 05 | budgets | Not Started |
| 07 | [Recurring Transaction Detection](EPIC-07-recurring.md) | 01, 04 | recurring_items; transactions modified | Not Started |
| 08 | [Installment Tracking](EPIC-08-installments.md) | 01, 04 | installment_groups; transactions modified | Not Started |
| 09 | [Savings Goals](EPIC-09-savings.md) | 01, 04 | saving_goals; transactions modified | Not Started |
| 10 | [Dashboards & Metabase Integration](EPIC-10-dashboards.md) | 01–09 | — | Not Started |
| 11 | [AI Financial Insights](EPIC-11-insights.md) | 01–09 | — | Not Started |
| 12 | [Dashboard Build (Umbrella)](EPIC-12-dashboard.md) | 01, 02 | budgets, recurring_items, installment_groups, saving_goals; transactions modified | Not Started |

## Open Decisions Resolved

| Decision | Epic | Resolution |
|----------|------|------------|
| H — Staging table schema | 02 | `staging_transactions` mirrors `transactions` + status, category_suggestion, confidence, statement_hash |
| I — Prisma schema | 01, 02 | Incremental — foundation in 01, core in 02, feature columns in 07–09 |
| J — Default category taxonomy | 01 | Seed script with ~10 top-level, ~30 subcategories in Portuguese |
| K — Categorization rules engine | 05 | DB table (`categorization_rules`) with keyword/pattern/exact types + priority |
| L — Historical data ingestion | 03 | Same `/api/statements/process` endpoint with `batch_mode` flag |
