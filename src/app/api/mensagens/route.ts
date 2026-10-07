import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, requireApiAuth } from "@/lib/api";
import { countUnread, insertOutbound, listInbox } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;
  try {
    const [items, unread] = await Promise.all([listInbox(), countUnread()]);
    return NextResponse.json({ items, unread });
  } catch (err) {
    return handle(err);
  }
}

const SendSchema = z.object({
  phone: z.string().min(8),
  text: z.string().min(1, "Escreva a mensagem."),
});

export async function POST(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const parsed = await parseBody(request, SendSchema);
  if (parsed.error) return parsed.error;

  const { sendText } = await import("@/lib/uazapi");
  const { getSettings } = await import("@/lib/settings");

  try {
    const settings = await getSettings();
    await sendText(settings, parsed.data.phone, parsed.data.text);
    await insertOutbound(parsed.data.phone, parsed.data.text);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
