import { prisma } from "@/lib/prisma";
import { ok, notFound, conflict, fromZodError } from "@/lib/api";
import { updateAccountSchema } from "@/lib/schemas/account";
import { Prisma } from "@/prisma/generated/client/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return notFound("Account not found");
  return ok(account);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
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
      return notFound("Account not found");
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return notFound("Account not found");

  const count = await prisma.source.count({ where: { account_id: id } });
  if (count > 0) {
    return conflict(
      `Cannot delete account: ${count} source(s) still reference it. Remove linked sources first.`
    );
  }

  await prisma.account.delete({ where: { id } });
  return ok({ id });
}
