import { beforeAll, beforeEach } from "vitest";
import { execSync } from "child_process";
import { PrismaClient } from "../prisma/generated/client/client";

const baseUrl = process.env.DATABASE_URL ?? "";
const testUrl = baseUrl.replace(/\/[^/?]+(\?|$)/, "/finance_test$1");
process.env.DATABASE_URL = testUrl;

export const prisma = new PrismaClient({
  datasourceUrl: testUrl,
});

const TABLES_IN_DELETE_ORDER = [
  "ProcessedStatement",
  "StagingTransaction",
  "Transaction",
  "Source",
  "Account",
  "Category",
];

beforeAll(async () => {
  execSync("npx prisma db push --force-reset --skip-generate", {
    env: {
      ...process.env,
      DATABASE_URL: testUrl,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
    },
    cwd: import.meta.dirname + "/..",
    stdio: "pipe",
  });
});

beforeEach(async () => {
  for (const table of TABLES_IN_DELETE_ORDER) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes("does not exist") && !msg.includes("relation")) {
        throw error;
      }
    }
  }
});
