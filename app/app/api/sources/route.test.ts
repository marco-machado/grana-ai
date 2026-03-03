import { describe, it, expect } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/test/setup";

function postRequest(data: unknown) {
  return new Request("http://localhost/api/sources", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/sources", () => {
  it("creates a source and returns 201 with account info", async () => {
    const account = await prisma.account.create({
      data: { name: "Nubank", type: "CHECKING" },
    });

    const res = await POST(
      postRequest({
        name: "Gmail",
        type: "EMAIL",
        identifier: "user@gmail.com",
        account_id: account.id,
      })
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data).toMatchObject({
      name: "Gmail",
      type: "EMAIL",
      identifier: "user@gmail.com",
      account: { id: account.id, name: "Nubank" },
    });
    expect(json.data.id).toBeDefined();
    expect(json.error).toBeNull();
  });

  it("returns 400 with field errors for missing fields", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.data).toBeNull();
    expect(json.error.fields).toBeDefined();
    expect(json.error.fields.name).toBeDefined();
    expect(json.error.fields.type).toBeDefined();
    expect(json.error.fields.identifier).toBeDefined();
    expect(json.error.fields.account_id).toBeDefined();
  });

  it("returns 400 when account_id does not exist", async () => {
    const res = await POST(
      postRequest({
        name: "Gmail",
        type: "EMAIL",
        identifier: "user@gmail.com",
        account_id: "00000000-0000-0000-0000-000000000000",
      })
    );
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.fields?.account_id).toContain("Conta não encontrada");
  });

  it("returns 409 for duplicate (account_id, type, identifier)", async () => {
    const account = await prisma.account.create({
      data: { name: "Nubank", type: "CHECKING" },
    });
    const payload = {
      name: "Gmail",
      type: "EMAIL",
      identifier: "user@gmail.com",
      account_id: account.id,
    };

    await POST(postRequest(payload));
    const res = await POST(postRequest({ ...payload, name: "Gmail Copy" }));
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error.message).toContain("Já existe");
  });
});

describe("GET /api/sources", () => {
  it("returns 200 with empty array when no sources exist", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toEqual([]);
    expect(json.error).toBeNull();
  });

  it("returns all sources with account info", async () => {
    const account = await prisma.account.create({
      data: { name: "Nubank", type: "CHECKING" },
    });
    await prisma.source.create({
      data: {
        name: "Gmail",
        type: "EMAIL",
        identifier: "user@gmail.com",
        account_id: account.id,
      },
    });

    const res = await GET();
    const json = await res.json();

    expect(json.data).toHaveLength(1);
    expect(json.data[0].account).toEqual({ id: account.id, name: "Nubank" });
  });
});
