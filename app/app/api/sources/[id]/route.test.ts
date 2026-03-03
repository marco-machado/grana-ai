import { describe, it, expect } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { prisma } from "@/test/setup";
import { randomUUID } from "crypto";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(data: unknown) {
  return new Request("http://localhost/api/sources/x", {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

function deleteRequest() {
  return new Request("http://localhost/api/sources/x", { method: "DELETE" });
}

function getRequest() {
  return new Request("http://localhost/api/sources/x");
}

async function createAccountAndSource(
  accountData = { name: "Nubank", type: "CHECKING" as const },
  sourceData?: Partial<{
    name: string;
    type: "EMAIL" | "CSV" | "API" | "MANUAL";
    identifier: string;
  }>
) {
  const account = await prisma.account.create({ data: accountData });
  const source = await prisma.source.create({
    data: {
      name: "Gmail",
      type: "EMAIL",
      identifier: "user@gmail.com",
      account_id: account.id,
      ...sourceData,
    },
  });
  return { account, source };
}

describe("GET /api/sources/[id]", () => {
  it("returns a single source with account info", async () => {
    const { account, source } = await createAccountAndSource();

    const res = await GET(getRequest(), makeParams(source.id));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toMatchObject({
      id: source.id,
      name: "Gmail",
      account: { id: account.id, name: "Nubank" },
    });
    expect(json.error).toBeNull();
  });

  it("returns 404 for non-existent UUID", async () => {
    const res = await GET(getRequest(), makeParams(randomUUID()));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.data).toBeNull();
    expect(json.error.message).toBe("Fonte não encontrada");
  });
});

describe("PATCH /api/sources/[id]", () => {
  it("updates a source and returns 200 with account info", async () => {
    const { account, source } = await createAccountAndSource();

    const res = await PATCH(
      patchRequest({ name: "Updated Gmail" }),
      makeParams(source.id)
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.name).toBe("Updated Gmail");
    expect(json.data.type).toBe("EMAIL");
    expect(json.data.account).toEqual({ id: account.id, name: "Nubank" });
  });

  it("returns 400 on invalid body", async () => {
    const { source } = await createAccountAndSource();

    const res = await PATCH(
      patchRequest({ type: "INVALID" }),
      makeParams(source.id)
    );
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.fields?.type).toBeDefined();
  });

  it("returns 400 when updating account_id to non-existent account", async () => {
    const { source } = await createAccountAndSource();

    const res = await PATCH(
      patchRequest({ account_id: randomUUID() }),
      makeParams(source.id)
    );
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error.fields?.account_id).toContain("Conta não encontrada");
  });

  it("returns 404 for non-existent UUID", async () => {
    const res = await PATCH(
      patchRequest({ name: "Updated" }),
      makeParams(randomUUID())
    );
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error.message).toBe("Fonte não encontrada");
  });

  it("returns 409 on unique constraint violation", async () => {
    const account = await prisma.account.create({
      data: { name: "Nubank", type: "CHECKING" },
    });
    await prisma.source.create({
      data: {
        name: "Source A",
        type: "EMAIL",
        identifier: "a@gmail.com",
        account_id: account.id,
      },
    });
    const sourceB = await prisma.source.create({
      data: {
        name: "Source B",
        type: "EMAIL",
        identifier: "b@gmail.com",
        account_id: account.id,
      },
    });

    const res = await PATCH(
      patchRequest({ identifier: "a@gmail.com" }),
      makeParams(sourceB.id)
    );
    expect(res.status).toBe(409);

    const json = await res.json();
    expect(json.error.message).toContain("Já existe");
  });
});

describe("DELETE /api/sources/[id]", () => {
  it("deletes a source and returns 200", async () => {
    const { source } = await createAccountAndSource();

    const res = await DELETE(deleteRequest(), makeParams(source.id));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toEqual({ id: source.id });

    const found = await prisma.source.findUnique({
      where: { id: source.id },
    });
    expect(found).toBeNull();
  });

  it("returns 404 for non-existent UUID", async () => {
    const res = await DELETE(deleteRequest(), makeParams(randomUUID()));
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.error.message).toBe("Fonte não encontrada");
  });
});
