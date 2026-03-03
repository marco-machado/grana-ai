import { describe, it, expect } from "vitest";
import { sourceBaseSchema, createSourceSchema, updateSourceSchema } from "./source";
import { SourceType } from "@/prisma/generated/client/client";
import { randomUUID } from "crypto";

describe("createSourceSchema", () => {
  const validPayload = {
    name: "Gmail",
    type: "EMAIL" as const,
    identifier: "user@gmail.com",
    account_id: randomUUID(),
  };

  it("accepts a valid payload", () => {
    const result = createSourceSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const { name, ...rest } = validPayload;
    const result = createSourceSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const { type, ...rest } = validPayload;
    const result = createSourceSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing identifier", () => {
    const { identifier, ...rest } = validPayload;
    const result = createSourceSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing account_id", () => {
    const { account_id, ...rest } = validPayload;
    const result = createSourceSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createSourceSchema.safeParse({
      ...validPayload,
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for account_id", () => {
    const result = createSourceSchema.safeParse({
      ...validPayload,
      account_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 255 characters", () => {
    const result = createSourceSchema.safeParse({
      ...validPayload,
      name: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with exactly 255 characters", () => {
    const result = createSourceSchema.safeParse({
      ...validPayload,
      name: "a".repeat(255),
    });
    expect(result.success).toBe(true);
  });

  it("rejects identifier longer than 500 characters", () => {
    const result = createSourceSchema.safeParse({
      ...validPayload,
      type: "CSV",
      identifier: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts identifier with exactly 500 characters", () => {
    const result = createSourceSchema.safeParse({
      ...validPayload,
      type: "CSV",
      identifier: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid source types", () => {
    const identifiers: Record<string, string> = {
      EMAIL: "user@gmail.com",
      CSV: "/path/to/file.csv",
      API: "https://api.bank.com/v1",
      MANUAL: "manual-entry",
    };
    for (const type of ["EMAIL", "CSV", "API", "MANUAL"]) {
      const result = createSourceSchema.safeParse({ ...validPayload, type, identifier: identifiers[type] });
      expect(result.success).toBe(true);
    }
  });
});

describe("enum sync", () => {
  it("covers all Prisma SourceType values", () => {
    const prismaValues = Object.values(SourceType);
    const zodValues = sourceBaseSchema.shape.type.options;
    expect(new Set(zodValues)).toEqual(new Set(prismaValues));
  });
});

describe("type-dependent identifier validation", () => {
  const base = {
    name: "Test",
    account_id: randomUUID(),
  };

  it("rejects invalid email for EMAIL type", () => {
    const result = createSourceSchema.safeParse({ ...base, type: "EMAIL", identifier: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts valid email for EMAIL type", () => {
    const result = createSourceSchema.safeParse({ ...base, type: "EMAIL", identifier: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL for API type", () => {
    const result = createSourceSchema.safeParse({ ...base, type: "API", identifier: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts valid URL for API type", () => {
    const result = createSourceSchema.safeParse({ ...base, type: "API", identifier: "https://api.bank.com/v1" });
    expect(result.success).toBe(true);
  });

  it("accepts any identifier for CSV type", () => {
    const result = createSourceSchema.safeParse({ ...base, type: "CSV", identifier: "any-string-works" });
    expect(result.success).toBe(true);
  });

  it("accepts any identifier for MANUAL type", () => {
    const result = createSourceSchema.safeParse({ ...base, type: "MANUAL", identifier: "any-string-works" });
    expect(result.success).toBe(true);
  });
});

describe("updateSourceSchema", () => {
  it("accepts partial payload with only name", () => {
    const result = updateSourceSchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts partial payload with only type", () => {
    const result = updateSourceSchema.safeParse({ type: "CSV" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateSourceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid type on partial", () => {
    const result = updateSourceSchema.safeParse({ type: "INVALID" });
    expect(result.success).toBe(false);
  });
});
