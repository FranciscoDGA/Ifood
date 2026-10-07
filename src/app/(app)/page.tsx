import Link from "next/link";
import {
  ArrowRight,
  Clock,
  MessageCircle,
  PackageCheck,
  Receipt,
  Wallet,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { getStats, listOrders } from "@/lib/repo";
import { money } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const [stats, orders] = await Promise.all([getStats(), listOrders({ limit: 8 })]);

  const cards = [
    {
      label: "Pedidos hoje",
      value: String(stats.todayOrders),
      hint: `${stats.deliveredToday} entregues`,
      icon: Receipt,
      tone: "bg-brand-50 text-brand-600",
    },
    {
      label: "Faturamento hoje",
      value: money(stats.todayRevenue),
      hint: `ticket médio ${money(stats.avgTicket)}`,
      icon: Wallet,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Em andamento",
      value: String(stats.pending),
      hint: "novo · preparo · a caminho",
      icon: Clock,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Entregues hoje",
      value: String(stats.deliveredToday),
      hint: "concluídos",
      icon: PackageCheck,
      tone: "bg-sky-50 text-sky-600",
    },
  ];

  const queue = orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Painel</h1>
          <p className="text-sm text-ink-500">
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            }).format(new Date())}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/mensagens"
            className="inline-flex items-center gap-2 rounded-lg border border-ink-300 bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Link>
          <Link
            href="/pedidos/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Novo pedido <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, hint, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-ink-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {label}
              </p>
              <span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-ink-900">{value}</p>
            <p className="text-[11px] text-ink-400">{hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-ink-200 bg-white">
        <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
          <h2 className="text-sm font-bold text-ink-900">Fila de agora</h2>
          <Link href="/pedidos" className="text-xs font-semibold text-brand-600 hover:underline">
            Ver todos
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-ink-600">Nenhum pedido em andamento.</p>
            <p className="mt-1 text-xs text-ink-400">
              Assim que chegar mensagem no WhatsApp, o alarme toca aqui.
            </p>
            <Link
              href="/pedidos/novo"
              className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Criar pedido
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {queue.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/pedidos/${o.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-ink-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {o.customerName || formatPhone(o.phone)}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {(o.items ?? []).map((i) => `${i.qty}x ${i.name}`).join(", ") || "—"}
                    </p>
                  </div>
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
