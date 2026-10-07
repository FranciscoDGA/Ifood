import { NextRequest, NextResponse } from "next/server";
import { handle, requireApiAuth } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { configureWebhook, getWebhook, UazapiError } from "@/lib/uazapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aponta a instância UAZAPI para o webhook deste app. */
export async function POST(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  try {
    const settings = await getSettings();
    const url = `${request.nextUrl.origin}/api/webhook/uazapi/${settings.webhookSecret}`;
    const result = await configureWebhook(settings, url);
    return NextResponse.json({ ok: true, url, result });
  } catch (err) {
    if (err instanceof UazapiError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    return handle(err);
  }
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;
  try {
    const settings = await getSettings();
    const current = await getWebhook(settings);
    return NextResponse.json({
      expected: `${request.nextUrl.origin}/api/webhook/uazapi/${settings.webhookSecret}`,
      current,
    });
  } catch (err) {
    if (err instanceof UazapiError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    return handle(err);
  }
}
