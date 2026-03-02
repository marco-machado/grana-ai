# Data Model: Project Scaffold & App Shell

**Feature Branch**: `001-project-scaffold`
**Date**: 2026-03-01

## Enums

### AccountType

Constrains financial account classification.

| Value | Description |
|-------|-------------|
| `CHECKING` | Bank checking account |
| `CREDIT` | Credit card |
| `SAVINGS` | Savings account |

**Source**: FR-007

### SourceType

Constrains data ingestion method classification.

| Value | Description |
|-------|-------------|
| `EMAIL` | Parsed from email statement |
| `CSV` | Imported from CSV file |
| `API` | Synced via external API |
| `MANUAL` | Manually entered |

**Source**: FR-008

## Entities

### Account

Represents a financial account (bank checking, credit card, savings).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK, DB-generated (`gen_random_uuid()`) | FR-013 |
| `name` | String | Required | e.g. "Nubank Credit" |
| `type` | AccountType | Required, enum | FR-007 |
| `created_at` | DateTime | Required, auto-set | FR-014 |
| `updated_at` | DateTime | Required, auto-updated | FR-014 (mutable table) |

**Relationships**:
- Has many `Source` records (one account can have multiple data sources)

**Validation rules**:
- `name` must be non-empty
- `type` must be a valid `AccountType` enum value

### Source

Represents where transaction data comes from.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK, DB-generated | FR-013 |
| `name` | String | Required | e.g. "Nubank Email" |
| `type` | SourceType | Required, enum | FR-008 |
| `identifier` | String | Required | Sender email, file pattern, or endpoint |
| `account_id` | UUID | FK → Account, required | Links source to its account |
| `created_at` | DateTime | Required, auto-set | FR-014 |
| `updated_at` | DateTime | Required, auto-updated | FR-014 (mutable table) |

**Relationships**:
- Belongs to one `Account`

**Validation rules**:
- `name` must be non-empty
- `identifier` must be non-empty
- `account_id` must reference an existing Account

### Category

Represents a spending or income classification. Hierarchical with one level of nesting.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK, DB-generated | FR-013 |
| `name` | String | Required, `@@unique([name, parent_id])` | In Portuguese (FR-010) |
| `parent_id` | UUID | FK → Category, nullable | Null = top-level category |
| `created_at` | DateTime | Required, auto-set | FR-014 (reference data, created_at only) |

**Relationships**:
- Self-referential: has optional `parent` (Category) and many `children` (Category[])

**Validation rules**:
- `name` must be non-empty
- Hierarchy is exactly one level deep (FR-015): a child category must have `parent_id` pointing to a top-level category (one whose `parent_id` is null)
- No category may have a `parent_id` pointing to another child category (no deeper nesting)

**State**: Reference data — seeded at application startup, rarely mutated.

## Seed Data: Category Taxonomy

10 top-level categories, 35 subcategories. All names in Portuguese (FR-010).

| Top-level | Subcategories |
|-----------|---------------|
| Moradia | Aluguel, Condominio, Energia, Agua, Gas, Internet |
| Alimentacao | Supermercado, Restaurantes, Delivery, Padaria |
| Transporte | Combustivel, Transporte Publico, Estacionamento, Manutencao Veiculo |
| Saude | Plano de Saude, Farmacia, Consultas |
| Educacao | Mensalidade, Cursos, Livros |
| Lazer | Entretenimento, Viagens, Esportes |
| Servicos e Assinaturas | Streaming, Software, Telefonia |
| Vestuario | Roupas, Calcados |
| Financeiro | Investimentos, Taxas Bancarias, Seguros, Impostos |
| Renda | Salario, Freelance, Rendimentos |

**Total**: 10 top-level + 35 subcategories = 45 categories

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐
│   Account    │       │    Source     │
├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │
│ name         │  │    │ name         │
│ type         │  │    │ type         │
│              │  └───▶│ account_id   │
│ created_at   │       │ identifier   │
│ updated_at   │       │ created_at   │
└──────────────┘       │ updated_at   │
                       └──────────────┘

┌──────────────┐
│   Category   │
├──────────────┤
│ id (PK)      │──┐
│ name         │  │ self-ref
│ parent_id    │◀─┘ (one level)
│ created_at   │
└──────────────┘
```
