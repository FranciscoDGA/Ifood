import { NextRequest, NextResponse } from "next/server";
import { handle, requireApiAuth } from "@/lib/api";
import { listConversation } from "@/lib/repo";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/db/migrate";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const { phone: raw } = await params;
  const phone = normalizePhone(decodeURIComponent(raw));

  try {
    await ensureSchema();
    const [items, customer] = await Promise.all([
      listConversation(phone),
      db.select().from(customers).where(eq(customers.phone, phone)).limit(1),
    ]);
    return NextResponse.json({
      phone,
      display: formatPhone(phone),
      customer: customer[0] ?? null,
      items,
    });
  } catch (err) {
    return handle(err);
  }
}
