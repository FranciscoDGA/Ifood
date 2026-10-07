"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  XCircle,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import { money } from "@/lib/money";
import { formatPhone, waLink } from "@/lib/phone";
import { ORDER_STATUS, type OrderStatus } from "@/lib/repo";
import type { Order } from "@/lib/db/schema";

const STEPS: OrderStatus[] = ["novo", "em_preparo", "a_caminho", "entregue"];

export default function OrderDetail({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<OrderStatus>(order.status as OrderStatus);

  const items = order.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const fee = Number(order.deliveryFee || 0);

  async function goTo(status: OrderStatus) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/pedidos/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível alterar o status.");
        return;
      }
      setCurrent(data.order.status as OrderStatus);
      router.refresh();
    } catch {
      setError("Sem conexão com o servidor.");
    } finally {
      setBusy(false);
    }
  }

  const idx = STEPS.indexOf(current);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <div className="rounded-xl border border-ink-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Pedido
              </p>
              <h1 className="text-xl font-bold text-ink-900">
                {order.customerName || formatPhone(order.phone)}
              </h1>
              <p className="text-sm text-ink-500">{formatPhone(order.phone)}</p>
            </div>
            <StatusBadge status={current} />
          </div>

          {/* Stepper */}
          <div className="mt-5 grid grid-cols-4 gap-1.5">
            {STEPS.map((s, i) => {
              const done = idx > i;
              const activeIdx = idx === i;
              return (
                <div key={s} className="text-center">
                  <div
                    className={`h-1.5 rounded-full ${
                      done || activeIdx ? "bg-brand-500" : "bg-ink-200"
                    }`}
                  />
                  <p
                    className={`mt-1.5 text-[11px] font-semibold ${
                      done || activeIdx ? "text-brand-600" : "text-ink-400"
                    }`}
                  >
                    {ORDER_STATUS[s].label}
                  </p>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {order.waNotifyStatus === "failed" && order.waNotifyError && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Último envio de WhatsApp falhou: {order.waNotifyError}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {current === "novo" && (
              <ActionButton
                busy={busy}
                onClick={() => goTo("em_preparo")}
                icon={<ChefHat className="h-4 w-4" />}
                label="Aceitar e preparar"
              />
            )}
            {current === "em_preparo" && (
              <ActionButton
                busy={busy}
                onClick={() => goTo("a_caminho")}
                icon={<MessageCircle className="h-4 w-4" />}
                label="Saiu para entrega (avisa no WhatsApp)"
                primary
              />
            )}
            {current === "a_caminho" && (
              <ActionButton
                busy={busy}
                onClick={() => goTo("entregue")}
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Entregue"
              />
            )}
            {current !== "entregue" && current !== "cancelado" && (
              <button
                disabled={busy}
                onClick={() => goTo("cancelado")}
                className="inline-flex items-center gap-2 rounded-lg border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-100 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Cancelar
              </button>
            )}
            {current === "cancelado" && (
              <ActionButton
                busy={busy}
                onClick={() => goTo("novo")}
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Reabrir pedido"
              />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-900">Itens</h2>
          <ul className="divide-y divide-ink-100">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-xs font-bold text-ink-700">
                  {it.qty}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{it.name}</span>
                <span className="text-sm text-ink-500">{money(it.price)}</span>
                <span className="w-20 text-right text-sm font-semibold text-ink-900">
                  {money(it.qty * it.price)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-ink-200 pt-3 text-sm">
            <Row label="Subtotal" value={money(subtotal)} />
            <Row label="Entrega" value={money(fee)} />
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-ink-900">Total</span>
              <span className="text-lg font-bold text-brand-600">{money(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-900">Entrega</h2>
          <p className="flex items-start gap-2 text-sm text-ink-700">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
            <span>{order.address || "Endereço não informado"}</span>
          </p>
          {order.notes && (
            <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600">
              {order.notes}
            </p>
          )}
          <p className="mt-3 text-xs text-ink-400">
            Criado em{" "}
            {new Date(order.createdAt).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        </div>

        <div className="rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-ink-900">Cliente</h2>
          <div className="flex flex-col gap-2">
            <a
              href={waLink(order.phone)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-wa px-4 py-2.5 text-sm font-semibold text-white hover:bg-wa-dark"
            >
              <MessageCircle className="h-4 w-4" /> Abrir no WhatsApp
            </a>
            <a
              href={`tel:+${order.phone}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100"
            >
              <Phone className="h-4 w-4" /> Ligar
            </a>
            <Link
              href="/mensagens"
              className="text-center text-xs font-semibold text-brand-600 hover:underline"
            >
              Ver conversa no painel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-ink-600">
      <span>{label}</span>
      <span className="font-medium text-ink-800">{value}</span>
    </div>
  );
}

function ActionButton({
  busy,
  onClick,
  icon,
  label,
  primary,
}: {
  busy: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
        primary
          ? "bg-brand-500 text-white hover:bg-brand-600"
          : "border border-ink-300 text-ink-700 hover:bg-ink-100"
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
