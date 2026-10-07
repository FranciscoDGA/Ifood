import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, requireApiAuth } from "@/lib/api";
import { createOrder, getStats, listOrders, type OrderStatus } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  try {
    const [items, stats] = await Promise.all([
      listOrders({
        status: (sp.get("status") as OrderStatus | "all") || "all",
        q: sp.get("q") ?? "",
      }),
      getStats(),
    ]);
    return NextResponse.json({ items, stats });
  } catch (err) {
    return handle(err);
  }
}

const ItemSchema = z.object({
  name: z.string().min(1, "Informe o item."),
  qty: z.number().int().min(1),
  price: z.number().min(0),
});

export const CreateOrderSchema = z.object({
  phone: z.string().min(10, "Informe o WhatsApp do cliente."),
  customerName: z.string().default(""),
  items: z.array(ItemSchema).min(1, "Adicione ao menos um item."),
  deliveryFee: z.number().min(0).default(0),
  address: z.string().default(""),
  notes: z.string().default(""),
  sourceMessageId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const parsed = await parseBody(request, CreateOrderSchema);
  if (parsed.error) return parsed.error;

  try {
    const order = await createOrder(parsed.data);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return handle(err);
  }
}
