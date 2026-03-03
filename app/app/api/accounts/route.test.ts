import { describe, it, expect } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/test/setup";

function postRequest(data: unknown) {
  return new Request("http://localhost/api/accounts", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/accounts", () => {
  it("creates an account and returns 201", async () => {
    const res = await POST(postRequest({ name: "Nubank", type: "CHECKING" }));
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data).toMatchObject({ name: "Nubank", type: "CHECKING" });
    expect(json.data.id).toBeDefined();
    expect(json.error).toBeNull();
  });

  it("returns 400 with field errors for empty body", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.data).toBeNull();
    expect(json.error.fields).toBeDefined();
    expect(json.error.fields.name).toBeDefined();
    expect(json.error.fields.type).toBeDefined();
  });

  it("returns 400 for invalid account type", async () => {
    const res = await POST(postRequest({ name: "Test", type: "INVALID" }));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.fields?.type).toBeDefined();
  });
});

describe("GET /api/accounts", () => {
  it("returns 200 with empty array when no accounts exist", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toEqual([]);
    expect(json.error).toBeNull();
  });

  it("returns all accounts ordered by created_at desc", async () => {
    await prisma.account.create({ data: { name: "First", type: "CHECKING" } });
    await prisma.account.create({ data: { name: "Second", type: "SAVINGS" } });

    const res = await GET();
    const json = await res.json();

    expect(json.data).toHaveLength(2);
    expect(json.data[0].name).toBe("Second");
    expect(json.data[1].name).toBe("First");
  });
});
