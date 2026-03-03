import { z } from "zod";

export const sourceBaseSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.enum(["EMAIL", "CSV", "API", "MANUAL"]),
  identifier: z.string().trim().min(1).max(500),
  account_id: z.uuid(),
});

export const createSourceSchema = sourceBaseSchema.superRefine((data, ctx) => {
  if (data.type === "EMAIL" && !z.email().safeParse(data.identifier).success) {
    ctx.addIssue({ code: "custom", path: ["identifier"], message: "Must be a valid email for EMAIL sources" });
  }
  if (data.type === "API" && !z.url().safeParse(data.identifier).success) {
    ctx.addIssue({ code: "custom", path: ["identifier"], message: "Must be a valid URL for API sources" });
  }
});

export const updateSourceSchema = sourceBaseSchema.partial().superRefine((data, ctx) => {
  if (data.type === "EMAIL" && data.identifier && !z.email().safeParse(data.identifier).success) {
    ctx.addIssue({ code: "custom", path: ["identifier"], message: "Must be a valid email for EMAIL sources" });
  }
  if (data.type === "API" && data.identifier && !z.url().safeParse(data.identifier).success) {
    ctx.addIssue({ code: "custom", path: ["identifier"], message: "Must be a valid URL for API sources" });
  }
});
