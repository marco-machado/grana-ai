import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate } from "./utils";

describe("formatCurrency", () => {
  it("formats positive BRL values", () => {
    expect(formatCurrency(1234.56)).toContain("1.234,56");
  });

  it("formats negative BRL values", () => {
    expect(formatCurrency(-500)).toContain("500,00");
  });
});

describe("formatDate", () => {
  it("formats ISO date to pt-BR format", () => {
    const result = formatDate("2026-03-05");
    expect(result).toMatch(/\d{2}\/\d{2}\/2026/);
  });
});
