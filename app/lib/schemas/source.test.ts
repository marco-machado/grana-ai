import { describe, it, expect } from "vitest";
import { createSourceSchema, updateSourceSchema } from "./source";
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
      identifier: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts identifier with exactly 500 characters", () => {
    const result = createSourceSchema.safeParse({
      ...validPayload,
      identifier: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid source types", () => {
    for (const type of ["EMAIL", "CSV", "API", "MANUAL"]) {
      const result = createSourceSchema.safeParse({ ...validPayload, type });
      expect(result.success).toBe(true);
    }
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
