import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  passwordMatches,
  rateLimited,
  SESSION_COOKIE,
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (rateLimited(`login:${ip}`)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 1 minuto." },
      { status: 429 }
    );
  }

  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* ignore */
  }

  const password = body.password ?? "";
  if (!password || !passwordMatches(password)) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
