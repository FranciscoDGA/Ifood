import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, requireApiAuth } from "@/lib/api";
import {
  getOrder,
  markNotified,
  setOrderStatus,
  type OrderStatus,
} from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { buildMessage, orderSummary } from "@/lib/templates";
import { money, toNumber } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  novo: ["em_preparo", "cancelado"],
  em_preparo: ["a_caminho", "novo", "cancelado"],
  a_caminho: ["entregue", "em_preparo", "cancelado"],
  entregue: [],
  cancelado: ["novo"],
};

const Body = z.object({ status: z.string().min(1) });

/**
 * Muda o status do pedido. Em "a_caminho" o envio do WhatsApp é obrigatório:
 * se falhar, o status volta para o anterior (rollback) e o erro é retornado.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireApiAuth(request);
  if (denied) return denied;

  const { id } = await params;
  const parsed = await parseBody(request, Body);
  if (parsed.error) return parsed.error;

  try {
    const order = await getOrder(decodeURIComponent(id));
    if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

    const next = parsed.data.status as OrderStatus;
    if (!(next in ALLOWED)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const previous = order.status as OrderStatus;
    if (previous === next) return NextResponse.json({ order });
    if (!ALLOWED[previous].includes(next)) {
      return NextResponse.json(
        { error: `Transição não permitida: ${previous} → ${next}` },
        { status: 400 }
      );
    }

    const settings = await getSettings();
    const vars = {
      nome: order.customerName || "cliente",
      pedido: orderSummary(order.items ?? []),
      valor: money(toNumber(order.total)),
      entrega: order.address || "sem endereço informado",
      telefone: formatPhone(order.phone),
    };

    let notify = { attempted: false, ok: true, error: "" };

    // Sair para entrega é obrigatoriamente notificado.
    if (next === "a_caminho") {
      notify = await trySend(settings, "templateACaminho", vars, order.phone);
      if (!notify.ok) {
        return NextResponse.json(
          {
            error:
              "Não foi possível enviar o WhatsApp ao cliente. O status não foi alterado. " +
              notify.error,
            order,
          },
          { status: 502 }
        );
      }
    }

    const updated = await setOrderStatus(order.id, next);

    if (next === "a_caminho") {
      await markNotified(order.id, true);
    } else if (
      (next === "em_preparo" && settings.notifyConfirmado) ||
      (next === "entregue" && settings.notifyEntregue) ||
      (next === "cancelado" && settings.notifyCancelado)
    ) {
      const templateKey =
        next === "em_preparo"
          ? "templateConfirmado"
          : next === "entregue"
            ? "templateEntregue"
            : "templateCancelado";
      const optional = await trySend(settings, templateKey, vars, order.phone);
      await markNotified(order.id, optional.ok, optional.error);
    }

    return NextResponse.json({ order: updated, notify });
  } catch (err) {
    return handle(err);
  }
}

async function trySend(
  settings: Awaited<ReturnType<typeof getSettings>>,
  key:
    | "templateConfirmado"
    | "templateACaminho"
    | "templateEntregue"
    | "templateCancelado",
  vars: Record<string, string>,
  phone: string
): Promise<{ attempted: boolean; ok: boolean; error: string }> {
  try {
    const { sendText } = await import("@/lib/uazapi");
    const text = buildMessage(settings, key, vars);
    if (!text.trim()) return { attempted: true, ok: true, error: "" };
    await sendText(settings, phone, text);
    return { attempted: true, ok: true, error: "" };
  } catch (err) {
    return {
      attempted: true,
      ok: false,
      error: err instanceof Error ? err.message : "Falha no envio.",
    };
  }
}
