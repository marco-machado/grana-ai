import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/test/setup";

describe("Schema: Budget", () => {
  it("creates a budget with required fields", async () => {
    const category = await prisma.category.create({ data: { name: "Alimentação" } });
    const budget = await prisma.budget.create({
      data: { category_id: category.id, amount: 1500.0 },
    });

    expect(budget.id).toBeDefined();
    expect(budget.status).toBe("ACTIVE");
    expect(budget.period).toBeNull();
  });

  it("creates a monthly override budget", async () => {
    const category = await prisma.category.create({ data: { name: "Transporte" } });
    const budget = await prisma.budget.create({
      data: { category_id: category.id, amount: 500.0, period: new Date("2026-03-01") },
    });

    expect(budget.period).toEqual(new Date("2026-03-01"));
  });

  it("enforces unique (category_id, period) for non-null periods", async () => {
    const category = await prisma.category.create({ data: { name: "Lazer" } });
    await prisma.budget.create({
      data: { category_id: category.id, amount: 300.0, period: new Date("2026-03-01") },
    });

    await expect(
      prisma.budget.create({
        data: { category_id: category.id, amount: 400.0, period: new Date("2026-03-01") },
      })
    ).rejects.toThrow();
  });

  it("enforces unique default template per category (partial index)", async () => {
    const category = await prisma.category.create({ data: { name: "Saúde" } });
    await prisma.budget.create({
      data: { category_id: category.id, amount: 200.0 },
    });

    await expect(
      prisma.budget.create({
        data: { category_id: category.id, amount: 300.0 },
      })
    ).rejects.toThrow();
  });

  it("allows different categories to each have a default template", async () => {
    const cat1 = await prisma.category.create({ data: { name: "Educação" } });
    const cat2 = await prisma.category.create({ data: { name: "Moradia" } });

    const b1 = await prisma.budget.create({ data: { category_id: cat1.id, amount: 100.0 } });
    const b2 = await prisma.budget.create({ data: { category_id: cat2.id, amount: 200.0 } });

    expect(b1.id).toBeDefined();
    expect(b2.id).toBeDefined();
  });
});

describe("Schema: RecurringItem", () => {
  it("creates a recurring item with required fields", async () => {
    const item = await prisma.recurringItem.create({
      data: {
        name: "Netflix",
        amount: 39.9,
        frequency: "MONTHLY",
        next_date: new Date("2026-04-01"),
        type: "SUBSCRIPTION",
      },
    });

    expect(item.id).toBeDefined();
    expect(item.category_id).toBeNull();
    expect(item.account_id).toBeNull();
  });

  it("creates a recurring item with category and account", async () => {
    const category = await prisma.category.create({ data: { name: "Streaming" } });
    const account = await prisma.account.create({ data: { name: "Nubank", type: "CHECKING" } });

    const item = await prisma.recurringItem.create({
      data: {
        name: "Spotify",
        amount: 21.9,
        frequency: "MONTHLY",
        next_date: new Date("2026-04-15"),
        type: "SUBSCRIPTION",
        category_id: category.id,
        account_id: account.id,
      },
    });

    expect(item.category_id).toBe(category.id);
    expect(item.account_id).toBe(account.id);
  });
});

describe("Schema: InstallmentGroup", () => {
  it("creates an installment group with required fields", async () => {
    const group = await prisma.installmentGroup.create({
      data: {
        description: "iPhone 15",
        total_amount: 6000.0,
        installments_total: 12,
        frequency: "MONTHLY",
        start_date: new Date("2026-01-01"),
      },
    });

    expect(group.id).toBeDefined();
    expect(group.installments_total).toBe(12);
  });
});

describe("Schema: SavingGoal", () => {
  it("creates a saving goal with required fields", async () => {
    const goal = await prisma.savingGoal.create({
      data: { name: "Fundo de emergência", target_amount: 50000.0 },
    });

    expect(goal.id).toBeDefined();
    expect(goal.deadline).toBeNull();
    expect(goal.linked_account_id).toBeNull();
  });

  it("creates a saving goal with linked account", async () => {
    const account = await prisma.account.create({ data: { name: "Poupança", type: "SAVINGS" } });
    const goal = await prisma.savingGoal.create({
      data: {
        name: "Viagem",
        target_amount: 10000.0,
        deadline: new Date("2026-12-31"),
        linked_account_id: account.id,
      },
    });

    expect(goal.linked_account_id).toBe(account.id);
    expect(goal.deadline).toEqual(new Date("2026-12-31"));
  });
});

describe("Schema: Transaction extensions", () => {
  it("creates a transaction with new default fields", async () => {
    const account = await prisma.account.create({ data: { name: "Itaú", type: "CHECKING" } });
    const source = await prisma.source.create({
      data: { name: "Email", type: "EMAIL", identifier: "test@test.com", account_id: account.id },
    });

    const tx = await prisma.transaction.create({
      data: {
        date: new Date("2026-03-01"),
        description_raw: "PIX RECEBIDO",
        description_clean: "PIX recebido",
        amount: 1000.0,
        account_id: account.id,
        source_id: source.id,
      },
    });

    expect(tx.is_recurring).toBe(false);
    expect(tx.recurring_item_id).toBeNull();
    expect(tx.installment_group_id).toBeNull();
    expect(tx.is_savings_transfer).toBe(false);
    expect(tx.saving_goal_id).toBeNull();
  });

  it("links a transaction to a recurring item", async () => {
    const account = await prisma.account.create({ data: { name: "Bradesco", type: "CHECKING" } });
    const source = await prisma.source.create({
      data: { name: "CSV", type: "CSV", identifier: "bradesco.csv", account_id: account.id },
    });
    const recurring = await prisma.recurringItem.create({
      data: {
        name: "Aluguel",
        amount: 2500.0,
        frequency: "MONTHLY",
        next_date: new Date("2026-04-01"),
        type: "BILL",
      },
    });

    const tx = await prisma.transaction.create({
      data: {
        date: new Date("2026-03-01"),
        description_raw: "PAGAMENTO ALUGUEL",
        description_clean: "Aluguel",
        amount: -2500.0,
        account_id: account.id,
        source_id: source.id,
        is_recurring: true,
        recurring_item_id: recurring.id,
      },
    });

    expect(tx.is_recurring).toBe(true);
    expect(tx.recurring_item_id).toBe(recurring.id);
  });

  it("nullifies recurring_item_id when RecurringItem is deleted", async () => {
    const account = await prisma.account.create({ data: { name: "C6", type: "CHECKING" } });
    const source = await prisma.source.create({
      data: { name: "API", type: "API", identifier: "c6-api", account_id: account.id },
    });
    const recurring = await prisma.recurringItem.create({
      data: {
        name: "Gym",
        amount: 99.0,
        frequency: "MONTHLY",
        next_date: new Date("2026-04-01"),
        type: "SUBSCRIPTION",
      },
    });

    const tx = await prisma.transaction.create({
      data: {
        date: new Date("2026-03-01"),
        description_raw: "SMART FIT",
        description_clean: "Smart Fit",
        amount: -99.0,
        account_id: account.id,
        source_id: source.id,
        recurring_item_id: recurring.id,
      },
    });

    await prisma.recurringItem.delete({ where: { id: recurring.id } });
    const updated = await prisma.transaction.findUnique({ where: { id: tx.id } });
    expect(updated!.recurring_item_id).toBeNull();
  });
});

let accountId: string;
let sourceId: string;

beforeEach(async () => {
  const account = await prisma.account.create({
    data: { name: "Test Bank", type: "CHECKING" },
  });
  accountId = account.id;

  const source = await prisma.source.create({
    data: {
      name: "Email Parser",
      type: "EMAIL",
      identifier: "test@bank.com",
      account_id: accountId,
    },
  });
  sourceId = source.id;
});

describe("Transaction deduplication", () => {
  it("duplicate insert via ON CONFLICT DO NOTHING does not increase row count", async () => {
    const date = new Date("2025-01-15");
    const descriptionRaw = "PIX ENVIO João";
    const amount = -150.0;

    await prisma.transaction.create({
      data: {
        date,
        description_raw: descriptionRaw,
        description_clean: "PIX para João",
        amount,
        account_id: accountId,
        source_id: sourceId,
      },
    });

    const countBefore = await prisma.transaction.count();
    expect(countBefore).toBe(1);

    await prisma.$executeRaw`
      INSERT INTO "Transaction" (id, date, description_raw, description_clean, amount, account_id, source_id, created_at, updated_at)
      VALUES (gen_random_uuid(), ${date}::date, ${descriptionRaw}, 'Clean', ${amount}, ${accountId}::uuid, ${sourceId}::uuid, now(), now())
      ON CONFLICT (account_id, date, amount, description_raw) DO NOTHING
    `;

    const countAfter = await prisma.transaction.count();
    expect(countAfter).toBe(1);
  });
});

describe("StagingTransaction defaults", () => {
  it("defaults to PENDING status when not specified", async () => {
    const staging = await prisma.stagingTransaction.create({
      data: {
        date: new Date("2025-01-15"),
        description_raw: "COMPRA DEBITO",
        description_clean: "Compra no débito",
        amount: -42.9,
        account_id: accountId,
        source_id: sourceId,
        statement_hash: "hash-001",
      },
    });

    const fetched = await prisma.stagingTransaction.findUniqueOrThrow({
      where: { id: staging.id },
    });
    expect(fetched.status).toBe("PENDING");
  });
});

describe("ProcessedStatement uniqueness", () => {
  it("rejects duplicate statement_hash with P2002 error", async () => {
    await prisma.processedStatement.create({
      data: {
        source_id: sourceId,
        statement_hash: "abc123",
      },
    });

    await expect(
      prisma.processedStatement.create({
        data: {
          source_id: sourceId,
          statement_hash: "abc123",
        },
      })
    ).rejects.toThrow(expect.objectContaining({ code: "P2002" }));
  });
});
