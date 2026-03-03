import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/test/setup";

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
