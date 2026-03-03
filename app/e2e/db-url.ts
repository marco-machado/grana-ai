const baseUrl = process.env.DATABASE_URL ?? "";
export const E2E_DATABASE_URL = baseUrl.replace(/\/[^/?]+(\?|$)/, "/finance_e2e$1");
