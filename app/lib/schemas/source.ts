import { z } from "zod";

export const createSourceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["EMAIL", "CSV", "API", "MANUAL"]),
  identifier: z.string().min(1).max(500),
  account_id: z.uuid(),
});

export const updateSourceSchema = createSourceSchema.partial();
