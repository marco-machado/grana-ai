import { z, type ZodError } from "zod";

type ApiSuccess<T> = { data: T; error: null };
type ApiError = { data: null; error: { message: string; fields?: Record<string, string[]> } };

function ok<T>(data: T): Response {
  return Response.json({ data, error: null } satisfies ApiSuccess<T>);
}

function created<T>(data: T): Response {
  return Response.json({ data, error: null } satisfies ApiSuccess<T>, { status: 201 });
}

function badRequest(message: string, fields?: Record<string, string[]>): Response {
  return Response.json({ data: null, error: { message, ...(fields && { fields }) } } satisfies ApiError, { status: 400 });
}

function notFound(message: string): Response {
  return Response.json({ data: null, error: { message } } satisfies ApiError, { status: 404 });
}

function conflict(message: string): Response {
  return Response.json({ data: null, error: { message } } satisfies ApiError, { status: 409 });
}

function serverError(message = "Internal server error"): Response {
  return Response.json(
    { data: null, error: { message } } satisfies ApiError,
    { status: 500 }
  );
}

function fromZodError(error: ZodError): Response {
  const flat = z.flattenError(error);
  const fields: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(flat.fieldErrors) as [string, string[]][]) {
    if (messages.length > 0) {
      fields[key] = messages;
    }
  }
  return badRequest("Validation failed", fields);
}

async function parseJson(request: Request): Promise<[unknown, null] | [null, Response]> {
  try {
    const body = await request.json();
    return [body, null];
  } catch {
    return [null, badRequest("Invalid JSON in request body")];
  }
}

export { ok, created, badRequest, notFound, conflict, serverError, fromZodError, parseJson };
