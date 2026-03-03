import { execSync } from "child_process";
import { E2E_DATABASE_URL } from "./db-url";

export default function globalSetup() {
  execSync("npx prisma db push --force-reset --skip-generate", {
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
    },
    stdio: "pipe",
  });
}
