import { NextRequest, NextResponse } from "next/server";
import { handle, requireApiAuth } from "@/lib/api";
import { markConversationRead } from "@/lib/repo";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const { phone: raw } = await params;
  try {
    await markConversationRead(normalizePhone(decodeURIComponent(raw)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handle(err);
  }
}
