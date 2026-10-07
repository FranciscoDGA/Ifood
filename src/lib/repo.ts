import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { ensureSchema } from "./db/migrate";
import { customers, messages, orders, type Order } from "./db/schema";
import { newId } from "./ids";
import { toNumber } from "./money";
import { normalizePhone } from "./phone";

export type OrderStatus = "novo" | "em_preparo" | "a_caminho" | "entregue" | "cancelado";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  novo: { label: "Novo", tone: "bg-brand-500 text-white" },
  em_preparo: { label: "Em preparo", tone: "bg-amber-400 text-ink-900" },
  a_caminho: { label: "A caminho", tone: "bg-sky-500 text-white" },
  entregue: { label: "Entregue", tone: "bg-emerald-500 text-white" },
  cancelado: { label: "Cancelado", tone: "bg-ink-300 text-ink-700" },
};

export const ORDER_FLOW: OrderStatus[] = ["novo", "em_preparo", "a_caminho", "entregue"];

function extractRows<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object" && Array.isArray((res as { rows?: T[] }).rows)) {
    return (res as { rows: T[] }).rows;
  }
  return [];
}

export type OrderItemInput = { name: string; qty: number; price: number };

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

export async function upsertCustomer(
  phone: string,
  name?: string,
  notes?: string
): Promise<string> {
  await ensureSchema();
  const normalized = normalizePhone(phone);
  const existing = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, normalized))
    .limit(1);

  if (existing[0]) {
    const cleanName = (name ?? "").trim();
    if (cleanName && cleanName !== existing[0].name) {
      await db
        .update(customers)
        .set({ name: cleanName, updatedAt: new Date() })
        .where(eq(customers.id, existing[0].id));
    }
    if (notes !== undefined && notes !== existing[0].notes) {
      await db
        .update(customers)
        .set({ notes, updatedAt: new Date() })
        .where(eq(customers.id, existing[0].id));
    }
    return existing[0].id;
  }

  const rows = await db
    .insert(customers)
    .values({
      id: newId("cus"),
      phone: normalized,
      name: (name ?? "").trim(),
      notes: notes ?? "",
    })
    .returning({ id: customers.id });
  return rows[0].id;
}

export async function listCustomers() {
  await ensureSchema();
  const rows = await db
    .select({
      id: customers.id,
      phone: customers.phone,
      name: customers.name,
      notes: customers.notes,
      createdAt: customers.createdAt,
      orderCount: sql<number>`(
        select count(*)::int from orders o where o.phone = ${customers.phone}
      )`,
      lastTotal: sql<string | null>`(
        select o.total from orders o where o.phone = ${customers.phone}
        order by o.created_at desc limit 1
      )`,
      lastOrderAt: sql<Date | null>`(
        select o.created_at from orders o where o.phone = ${customers.phone}
        order by o.created_at desc limit 1
      )`,
    })
    .from(customers)
    .orderBy(desc(customers.updatedAt));
  return rows;
}

export async function updateCustomer(id: string, patch: { name?: string; notes?: string }) {
  await ensureSchema();
  await db
    .update(customers)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(customers.id, id));
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export type InboundMessage = {
  id: string;
  waMessageId: string;
  chatId: string;
  phone: string;
  senderName: string;
  text: string;
  type: string;
  fromMe: boolean;
  isGroup: boolean;
  raw: unknown;
};

/** Insere se o messageid ainda não existir. Retorna false em duplicata. */
export async function insertMessageIfNew(msg: InboundMessage): Promise<boolean> {
  await ensureSchema();
  try {
    await db.insert(messages).values({
      id: newId("msg"),
      waMessageId: msg.waMessageId,
      chatId: msg.chatId,
      phone: normalizePhone(msg.phone),
      senderName: msg.senderName,
      text: msg.text,
      type: msg.type,
      fromMe: msg.fromMe,
      isGroup: msg.isGroup,
      raw: msg.raw as never,
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/duplicate|unique/i.test(message)) return false;
    throw err;
  }
}

export type InboxItem = {
  id: string;
  phone: string;
  senderName: string;
  text: string;
  fromMe: boolean;
  createdAt: Date;
  unread: boolean;
  customerName: string;
  lastOrderId: string | null;
  lastOrderStatus: string | null;
};

export async function listInbox(limit = 60): Promise<InboxItem[]> {
  await ensureSchema();
  const res = await db.execute(sql`
    with latest as (
      select distinct on (m.phone)
        m.id, m.phone, m.sender_name, m.text, m.from_me, m.created_at, m.read_at
      from messages m
      where m.is_group = false
      order by m.phone, m.created_at desc
    )
    select
      l.id,
      l.phone,
      l.sender_name,
      l.text,
      l.from_me,
      l.created_at,
      l.read_at,
      coalesce(c.name, '') as customer_name,
      o.id as last_order_id,
      o.status as last_order_status
    from latest l
    left join customers c on c.phone = l.phone
    left join lateral (
      select oo.id, oo.status from orders oo
      where oo.phone = l.phone
      order by oo.created_at desc limit 1
    ) o on true
    order by l.created_at desc
    limit ${limit}
  `);
  const rows = extractRows<{
    id: string;
    phone: string;
    sender_name: string;
    text: string;
    from_me: boolean;
    created_at: string | Date;
    read_at: string | Date | null;
    customer_name: string;
    last_order_id: string | null;
    last_order_status: string | null;
  }>(res);

  return rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    senderName: r.sender_name ?? "",
    text: r.text ?? "",
    fromMe: Boolean(r.from_me),
    createdAt: new Date(r.created_at),
    unread: r.read_at === null || r.read_at === undefined,
    customerName: r.customer_name ?? "",
    lastOrderId: r.last_order_id,
    lastOrderStatus: r.last_order_status,
  }));
}

export async function countUnread(): Promise<number> {
  await ensureSchema();
  const res = await db.execute(
    sql`select count(*)::int as n from messages where read_at is null and from_me = false and is_group = false`
  );
  const rows = extractRows<{ n: number }>(res);
  return Number(rows[0]?.n ?? 0);
}

export async function listConversation(phone: string, limit = 300) {
  await ensureSchema();
  const normalized = normalizePhone(phone);
  return db
    .select()
    .from(messages)
    .where(eq(messages.phone, normalized))
    .orderBy(messages.createdAt)
    .limit(limit);
}

export async function markConversationRead(phone: string): Promise<void> {
  await ensureSchema();
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.phone, normalizePhone(phone)), isNull(messages.readAt)));
}

export async function insertOutbound(phone: string, text: string): Promise<void> {
  await ensureSchema();
  await db.insert(messages).values({
    id: newId("msg"),
    phone: normalizePhone(phone),
    text,
    fromMe: true,
    type: "text",
  });
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export type CreateOrderInput = {
  phone: string;
  customerName: string;
  items: OrderItemInput[];
  deliveryFee: number;
  address: string;
  notes: string;
  customerId?: string;
  sourceMessageId?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  await ensureSchema();
  const phone = normalizePhone(input.phone);
  const customerId = input.customerId ?? (await upsertCustomer(phone, input.customerName));
  const total =
    input.items.reduce((sum, i) => sum + i.qty * i.price, 0) + input.deliveryFee;

  const rows = await db
    .insert(orders)
    .values({
      id: newId("ord"),
      customerId,
      phone,
      customerName: input.customerName,
      items: input.items as never,
      total: String(total),
      deliveryFee: String(input.deliveryFee),
      address: input.address,
      notes: input.notes,
      status: "novo",
      sourceMessageId: input.sourceMessageId ?? null,
    })
    .returning();
  return rows[0];
}

export async function getOrder(id: string): Promise<Order | null> {
  await ensureSchema();
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listOrders(opts?: {
  status?: OrderStatus | "all";
  q?: string;
  limit?: number;
}): Promise<Order[]> {
  await ensureSchema();
  const conditions = [];
  if (opts?.status && opts.status !== "all") {
    conditions.push(eq(orders.status, opts.status));
  }
  if (opts?.q) {
    const like = `%${opts.q}%`;
    conditions.push(
      sql`(${orders.phone} like ${like} or ${orders.customerName} like ${like} or ${orders.address} like ${like})`
    );
  }
  const query = db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(opts?.limit ?? 200);
  return conditions.length ? query.where(and(...conditions)) : query;
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  await ensureSchema();
  const rows = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();
  if (!rows[0]) throw new Error("Pedido não encontrado.");
  return rows[0];
}

export async function markNotified(
  id: string,
  ok: boolean,
  error?: string
): Promise<void> {
  await ensureSchema();
  await db
    .update(orders)
    .set({
      waNotifyStatus: ok ? "sent" : "failed",
      waNotifyAt: new Date(),
      waNotifyError: ok ? null : (error ?? null),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id));
}

export type Stats = {
  todayOrders: number;
  todayRevenue: number;
  pending: number;
  deliveredToday: number;
  avgTicket: number;
};

export async function getStats(): Promise<Stats> {
  await ensureSchema();
  const res = await db.execute(sql`
    select
      count(*) filter (where date(created_at at time zone 'America/Sao_Paulo') = current_date)::int as today_orders,
      coalesce(sum(total) filter (where date(created_at at time zone 'America/Sao_Paulo') = current_date), 0)::float as today_revenue,
      count(*) filter (where status in ('novo','em_preparo','a_caminho'))::int as pending,
      count(*) filter (
        where status = 'entregue'
          and date(created_at at time zone 'America/Sao_Paulo') = current_date
      )::int as delivered_today
    from orders
  `);
  const row = extractRows<{
    today_orders: number;
    today_revenue: number;
    pending: number;
    delivered_today: number;
  }>(res)[0];

  const todayOrders = Number(row?.today_orders ?? 0);
  const todayRevenue = Number(row?.today_revenue ?? 0);
  return {
    todayOrders,
    todayRevenue,
    pending: Number(row?.pending ?? 0),
    deliveredToday: Number(row?.delivered_today ?? 0),
    avgTicket: todayOrders > 0 ? todayRevenue / todayOrders : 0,
  };
}

export function orderTotal(order: Order): number {
  return toNumber(order.total);
}
