import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, notFound, conflict, fromZodError, parseJson } from "@/lib/api";
import { updateAccountSchema } from "@/lib/schemas/account";
import { Prisma } from "@/prisma/generated/client/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFound("Conta não encontrada");
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return notFound("Conta não encontrada");
  return ok(account);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFound("Conta não encontrada");
  const [body, error] = await parseJson(request);
  if (error) return error;
  const result = updateAccountSchema.safeParse(body);
  if (!result.success) return fromZodError(result.error);

  try {
    const account = await prisma.account.update({
      where: { id },
      data: result.data,
    });
    return ok(account);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return notFound("Conta não encontrada");
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return notFound("Conta não encontrada");
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return notFound("Conta não encontrada");

  const [sourceCount, txCount, stagingCount] = await Promise.all([
    prisma.source.count({ where: { account_id: id } }),
    prisma.transaction.count({ where: { account_id: id } }),
    prisma.stagingTransaction.count({ where: { account_id: id } }),
  ]);
  const total = sourceCount + txCount + stagingCount;
  if (total > 0) {
    return conflict(
      `Não é possível excluir a conta: ${total} registro(s) vinculado(s) ainda a referenciam. Remova fontes e transações vinculadas primeiro.`
    );
  }

  try {
    await prisma.account.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return notFound("Conta não encontrada");
      if (error.code === "P2003")
        return conflict(
          "Não é possível excluir a conta: registros vinculados foram adicionados simultaneamente"
        );
    }
    throw error;
  }
  return ok({ id });
}
