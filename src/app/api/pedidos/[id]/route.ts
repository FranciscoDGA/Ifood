import { NextRequest, NextResponse } from "next/server";
import { handle, requireApiAuth } from "@/lib/api";
import { getOrder } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;
  const { id } = await params;
  try {
    const order = await getOrder(decodeURIComponent(id));
    if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    return handle(err);
  }
}
