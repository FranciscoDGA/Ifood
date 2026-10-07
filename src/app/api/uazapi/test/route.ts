import { NextRequest, NextResponse } from "next/server";
import { handle, requireApiAuth } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { getMe, sendText, UazapiError } from "@/lib/uazapi";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  try {
    const settings = await getSettings();
    const me = await getMe(settings);

    const body = await request.json().catch(() => ({}) as { to?: string });
    const to = normalizePhone(body.to ?? "");
    let sent = false;
    if (to) {
      await sendText(settings, to, "✅ Teste de conexão do CRM de pedidos.");
      sent = true;
    }

    return NextResponse.json({ ok: true, instance: me, sent });
  } catch (err) {
    if (err instanceof UazapiError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    return handle(err);
  }
}
