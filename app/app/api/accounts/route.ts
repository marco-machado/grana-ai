import { prisma } from "@/lib/prisma";
import { ok, created, fromZodError } from "@/lib/api";
import { createAccountSchema } from "@/lib/schemas/account";

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { created_at: "desc" },
  });
  return ok(accounts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = createAccountSchema.safeParse(body);
  if (!result.success) return fromZodError(result.error);
  const account = await prisma.account.create({ data: result.data });
  return created(account);
}
