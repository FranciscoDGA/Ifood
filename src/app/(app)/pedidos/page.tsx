"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Plus, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { money } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { ORDER_FLOW, ORDER_STATUS, type OrderStatus } from "@/lib/repo";
import type { Order } from "@/lib/db/schema";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("erro");
  return res.json();
};

type Filter = OrderStatus | "all" | "abertos";

export default function PedidosPage() {
  const [status, setStatus] = useState<Filter>("abertos");
  const [q, setQ] = useState("");

  const query = new URLSearchParams();
  if (status !== "abertos") query.set("status", status);
  if (q.trim()) query.set("q", q.trim());

  const { data, isLoading } = useSWR<{ items: Order[]; stats: unknown }>(
    `/api/pedidos?${query.toString()}`,
    fetcher,
    { refreshInterval: 15000, keepPreviousData: true }
  );

  const items = useMemo(() => {
    const list = data?.items ?? [];
    if (status !== "abertos") return list;
    return list.filter((o) => o.status === "novo" || o.status === "em_preparo" || o.status === "a_caminho");
  }, [data, status]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "abertos", label: "Abertos" },
    { key: "all", label: "Todos" },
    ...ORDER_FLOW.map((s) => ({ key: s as Filter, label: ORDER_STATUS[s].label })),
    { key: "cancelado", label: "Cancelados" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Pedidos</h1>
          <p className="text-sm text-ink-500">{items.length} pedido(s) nesta lista</p>
        </div>
        <Link
          href="/pedidos/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> Novo pedido
        </Link>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                status === t.key
                  ? "bg-brand-500 text-white"
                  : "bg-white text-ink-600 border border-ink-200 hover:bg-ink-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative lg:ml-auto lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nome, telefone ou endereço"
            className="w-full rounded-lg border border-ink-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
        {isLoading && !data ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-ink-500">
            Nenhum pedido encontrado.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {items.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/pedidos/${o.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-ink-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {o.customerName || formatPhone(o.phone)}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {(o.items ?? []).map((i) => `${i.qty}x ${i.name}`).join(", ")}
                    </p>
                  </div>
                  <span className="hidden text-xs text-ink-400 sm:block">
                    {new Date(o.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-sm font-bold text-ink-800">{money(o.total)}</span>
                  <StatusBadge status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
