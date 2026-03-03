import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.enum(["CHECKING", "CREDIT", "SAVINGS"]),
});

export const updateAccountSchema = createAccountSchema.partial();
