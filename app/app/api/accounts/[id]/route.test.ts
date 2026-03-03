import { describe, it, expect } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { prisma } from "@/test/setup";
import { randomUUID } from "crypto";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(data: unknown) {
  return new Request("http://localhost/api/accounts/x", {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

function deleteRequest() {
  return new Request("http://localhost/api/accounts/x", { method: "DELETE" });
}

function getRequest() {
  return new Request("http://localhost/api/accounts/x");
}

describe("GET /api/accounts/[id]", () => {
  it("returns a single account by id", async () => {
    const account = await prisma.account.create({
      data: { name: "Nubank", type: "CHECKING" },
    });

    const res = await GET(getRequest(), makeParams(account.id));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toMatchObject({ id: account.id, name: "Nubank" });
    expect(json.error).toBeNull();
  });

  it("returns 404 for non-existent UUID", async () => {
    const res = await GET(getRequest(), makeParams(randomUUID()));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.data).toBeNull();
    expect(json.error.message).toBe("Conta não encontrada");
  });
});

describe("PATCH /api/accounts/[id]", () => {
  it("updates an account and returns 200", async () => {
    const account = await prisma.account.create({
      data: { name: "Old Name", type: "CHECKING" },
    });

    const res = await PATCH(
      patchRequest({ name: "New Name" }),
      makeParams(account.id)
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.name).toBe("New Name");
    expect(json.data.type).toBe("CHECKING");
  });

  it("returns 400 on invalid body", async () => {
    const account = await prisma.account.create({
      data: { name: "Test", type: "CHECKING" },
    });

    const res = await PATCH(
      patchRequest({ type: "INVALID" }),
      makeParams(account.id)
    );
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.fields?.type).toBeDefined();
  });

  it("returns 404 for non-existent UUID", async () => {
    const res = await PATCH(
      patchRequest({ name: "Updated" }),
      makeParams(randomUUID())
    );
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error.message).toBe("Conta não encontrada");
  });
});

describe("DELETE /api/accounts/[id]", () => {
  it("deletes an account with no sources and returns 200", async () => {
    const account = await prisma.account.create({
      data: { name: "To Delete", type: "SAVINGS" },
    });

    const res = await DELETE(deleteRequest(), makeParams(account.id));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toEqual({ id: account.id });

    const found = await prisma.account.findUnique({
      where: { id: account.id },
    });
    expect(found).toBeNull();
  });

  it("returns 409 when sources are linked", async () => {
    const account = await prisma.account.create({
      data: { name: "With Source", type: "CHECKING" },
    });
    await prisma.source.create({
      data: {
        name: "Gmail",
        type: "EMAIL",
        identifier: "test@gmail.com",
        account_id: account.id,
      },
    });

    const res = await DELETE(deleteRequest(), makeParams(account.id));
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error.message).toContain("registro(s) vinculado(s) ainda a referenciam");
  });

  it("returns 404 for non-existent UUID", async () => {
    const res = await DELETE(deleteRequest(), makeParams(randomUUID()));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error.message).toBe("Conta não encontrada");
  });
});
