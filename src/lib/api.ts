import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { apiAuthed, unauthorized } from "./session";

export async function requireApiAuth(request: NextRequest): Promise<NextResponse | null> {
  return (await apiAuthed(request)) ? null : unauthorized();
}

export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function parseBody<T>(request: NextRequest, schema: ZodType<T>): Promise<
  { data: T; error: null } | { data: null; error: NextResponse }
> {
  const body = await readJson(request);
  if (body === null) {
    return {
      data: null,
      error: NextResponse.json({ error: "JSON inválido." }, { status: 400 }),
    };
  }
  try {
    return { data: schema.parse(body), error: null };
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues.map((i) => i.message).join(" ");
      return {
        data: null,
        error: NextResponse.json({ error: message || "Dados inválidos." }, { status: 400 }),
      };
    }
    throw err;
  }
}

export function handle(err: unknown): NextResponse {
  const message = friendlyMessage(err);
  return NextResponse.json({ error: message }, { status: 500 });
}

/** O Drizzle embrulha o erro do Neon em "Failed query: … params:"; prefere a causa. */
function friendlyMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Erro inesperado.";
  if (err.message.startsWith("Failed query") && err.cause instanceof Error) {
    return err.cause.message || "Erro no banco de dados.";
  }
  return err.message || "Erro inesperado.";
}
