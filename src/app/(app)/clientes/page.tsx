"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Loader2, Save, Search, X } from "lucide-react";
import { money } from "@/lib/money";
import { formatPhone, waLink } from "@/lib/phone";

type Customer = {
  id: string;
  phone: string;
  name: string;
  notes: string;
  orderCount: number;
  lastTotal: string | null;
  lastOrderAt: string | null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("erro");
  return res.json();
};

export default function ClientesPage() {
  const { data, isLoading, mutate } = useSWR<{ items: Customer[] }>("/api/clientes", fetcher);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const items = (data?.items ?? []).filter((c) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term.replace(/\D/g, "")) ||
      c.notes.toLowerCase().includes(term)
    );
  });

  function startEdit(c: Customer) {
    setEditing(c.id);
    setForm({ name: c.name, notes: c.notes });
  }

  async function save(id: string) {
    setSaving(true);
    try {
      await fetch("/api/clientes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...form }),
      });
      setEditing(null);
      await mutate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Clientes</h1>
          <p className="text-sm text-ink-500">{items.length} cliente(s)</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, telefone ou nota"
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
            Nenhum cliente ainda. Eles entram automaticamente quando mandam mensagem.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {items.map((c) => (
              <li key={c.id} className="px-4 py-3">
                {editing === c.id ? (
                  <div className="space-y-2">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nome"
                      className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={2}
                      placeholder="Notas: preferências, alergias, ponto de referência…"
                      className="w-full resize-none rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => save(c.id)}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100"
                      >
                        <X className="h-3.5 w-3.5" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {c.name || formatPhone(c.phone)}
                        <span className="ml-2 text-xs font-normal text-ink-400">
                          {formatPhone(c.phone)}
                        </span>
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {c.notes || "Sem observações"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink-800">
                        {c.orderCount} pedido{c.orderCount === 1 ? "" : "s"}
                      </p>
                      <p className="text-[11px] text-ink-400">
                        {c.lastTotal ? `último ${money(c.lastTotal)}` : "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={waLink(c.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-wa px-3 py-1.5 text-xs font-semibold text-white hover:bg-wa-dark"
                      >
                        WhatsApp
                      </a>
                      <button
                        onClick={() => startEdit(c)}
                        className="rounded-lg border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
