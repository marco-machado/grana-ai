import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, fromZodError } from "@/lib/api";
import { createSourceSchema } from "@/lib/schemas/source";
import { Prisma } from "@/prisma/generated/client/client";

export async function GET() {
  const sources = await prisma.source.findMany({
    include: { account: { select: { id: true, name: true } } },
    orderBy: { created_at: "desc" },
  });
  return ok(sources);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = createSourceSchema.safeParse(body);
  if (!result.success) return fromZodError(result.error);

  const account = await prisma.account.findUnique({
    where: { id: result.data.account_id },
  });
  if (!account) {
    return badRequest("Validation failed", {
      account_id: ["Account not found"],
    });
  }

  try {
    const source = await prisma.source.create({
      data: result.data,
      include: { account: { select: { id: true, name: true } } },
    });
    return created(source);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return conflict(
        "A source with this account, type, and identifier already exists"
      );
    }
    throw error;
  }
}
