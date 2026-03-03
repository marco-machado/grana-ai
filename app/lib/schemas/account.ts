import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["CHECKING", "CREDIT", "SAVINGS"]),
});

export const updateAccountSchema = createAccountSchema.partial();
