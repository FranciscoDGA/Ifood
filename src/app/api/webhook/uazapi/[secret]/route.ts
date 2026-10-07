import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { insertMessageIfNew, upsertCustomer } from "@/lib/repo";
import { parseWebhook } from "@/lib/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;

  // Permite validar o segredo sem depender do banco (útil em healthchecks).
  const envSecret = process.env.WEBHOOK_SECRET;
  if (envSecret && !safeEqual(secret, envSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();

  if (!envSecret && (!settings.webhookSecret || !safeEqual(secret, settings.webhookSecret))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = parseWebhook(payload);

  const headerToken = request.headers.get("token") || "";
  const bodyToken = parsed.instanceToken;
  if (
    settings.uazapiToken &&
    (headerToken || bodyToken) &&
    !safeEqual(headerToken || bodyToken, settings.uazapiToken)
  ) {
    return NextResponse.json({ error: "bad instance token" }, { status: 401 });
  }

  if (!parsed.eventType.startsWith("messages")) {
    return NextResponse.json({ ok: true, ignored: parsed.eventType });
  }

  const msg = parsed.message;
  if (!msg || !msg.phone) {
    return NextResponse.json({ ok: true, ignored: "no message" });
  }
  if (settings.ignoreFromMe && msg.fromMe) {
    return NextResponse.json({ ok: true, ignored: "fromMe" });
  }
  if (settings.ignoreGroups && msg.isGroup) {
    return NextResponse.json({ ok: true, ignored: "group" });
  }

  const fresh = await insertMessageIfNew({
    id: msg.id,
    waMessageId: msg.id,
    chatId: msg.chatId,
    phone: msg.phone,
    senderName: msg.senderName,
    text: msg.text,
    type: msg.type,
    fromMe: msg.fromMe,
    isGroup: msg.isGroup,
    raw: payload,
  });
  if (fresh && !msg.fromMe) {
    await upsertCustomer(msg.phone, msg.senderName);
  }

  return NextResponse.json({ ok: true, stored: fresh });
}
