import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, fromZodError } from "@/lib/api";
import { updateSourceSchema } from "@/lib/schemas/source";
import { Prisma } from "@/prisma/generated/client/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const source = await prisma.source.findUnique({
    where: { id },
    include: { account: { select: { id: true, name: true } } },
  });
  if (!source) return notFound("Source not found");
  return ok(source);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = updateSourceSchema.safeParse(body);
  if (!result.success) return fromZodError(result.error);

  if (result.data.account_id) {
    const account = await prisma.account.findUnique({
      where: { id: result.data.account_id },
    });
    if (!account) {
      return badRequest("Validation failed", {
        account_id: ["Account not found"],
      });
    }
  }

  try {
    const source = await prisma.source.update({
      where: { id },
      data: result.data,
      include: { account: { select: { id: true, name: true } } },
    });
    return ok(source);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return notFound("Source not found");
      if (error.code === "P2002") {
        return conflict(
          "A source with this account, type, and identifier already exists"
        );
      }
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return notFound("Source not found");

  await prisma.source.delete({ where: { id } });
  return ok({ id });
}
