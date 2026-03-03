import { describe, it, expect } from "vitest";
import { createAccountSchema, updateAccountSchema } from "./account";

describe("createAccountSchema", () => {
  it("accepts a valid payload", () => {
    const result = createAccountSchema.safeParse({
      name: "Nubank",
      type: "CHECKING",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = createAccountSchema.safeParse({ type: "CHECKING" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createAccountSchema.safeParse({ name: "", type: "CHECKING" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 255 characters", () => {
    const result = createAccountSchema.safeParse({
      name: "a".repeat(256),
      type: "CHECKING",
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with exactly 255 characters", () => {
    const result = createAccountSchema.safeParse({
      name: "a".repeat(255),
      type: "CHECKING",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = createAccountSchema.safeParse({
      name: "Nubank",
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid account types", () => {
    for (const type of ["CHECKING", "CREDIT", "SAVINGS"]) {
      const result = createAccountSchema.safeParse({ name: "Test", type });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateAccountSchema", () => {
  it("accepts partial payload with only name", () => {
    const result = updateAccountSchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts partial payload with only type", () => {
    const result = updateAccountSchema.safeParse({ type: "CREDIT" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateAccountSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid type on partial", () => {
    const result = updateAccountSchema.safeParse({ type: "INVALID" });
    expect(result.success).toBe(false);
  });
});
