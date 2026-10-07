import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/db/migrate";
import { apiAuthed, unauthorized } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  phone: string;
  sender_name: string;
  text: string;
  created_at: string | Date;
};

function rows<T = Row>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && Array.isArray((res as { rows?: T[] }).rows)) {
    return (res as { rows: T[] }).rows;
  }
  return [];
}

/**
 * O painel faz polling aqui a cada 3-5s. Retorna a contagem de não lidas e as
 * mensagens novas desde `since` — é o gatilho do alarme.
 */
export async function GET(request: NextRequest) {
  if (!(await apiAuthed(request))) return unauthorized();
  await ensureSchema();

  const sinceRaw = request.nextUrl.searchParams.get("since");
  const since = sinceRaw ? Number(sinceRaw) : NaN;

  const unreadRes = await db.execute(sql`
    select count(*)::int as n from messages
    where read_at is null and from_me = false and is_group = false
  `);
  const unread = Number(rows<{ n: number }>(unreadRes)[0]?.n ?? 0);

  let newMessages: Row[] = [];
  if (Number.isFinite(since) && since > 0) {
    const res = await db.execute(sql`
      select id, phone, sender_name, text, created_at from messages
      where from_me = false and is_group = false
        and created_at > ${new Date(since).toISOString()}
      order by created_at asc
      limit 10
    `);
    newMessages = rows(res);
  }

  return NextResponse.json({
    unread,
    serverTime: Date.now(),
    newMessages: newMessages.map((r) => ({
      id: r.id,
      phone: r.phone,
      senderName: r.sender_name,
      text: r.text,
      createdAt: new Date(r.created_at).getTime(),
    })),
  });
}
