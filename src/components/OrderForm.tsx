"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import ItemsEditor, { type Item } from "./ItemsEditor";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { money, parseMoneyInput } from "@/lib/money";

export default function OrderForm({
  initial,
  submitLabel = "Criar pedido",
}: {
  initial?: {
    phone?: string;
    customerName?: string;
    address?: string;
    notes?: string;
    items?: Item[];
    sourceMessageId?: string;
  };
  submitLabel?: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [items, setItems] = useState<Item[]>(
    initial?.items?.length ? initial.items : [{ name: "", qty: 1, price: 0 }]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => items.reduce((s, i) => s + i.qty * i.price, 0) + parseMoneyInput(deliveryFee),
    [items, deliveryFee]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const normalized = normalizePhone(phone);
    if (normalized.replace(/\D/g, "").length < 12) {
      setError("Informe um WhatsApp válido com DDD, ex.: 11 99999-8888.");
      return;
    }
    const cleanItems = items.filter((i) => i.name.trim() && i.qty > 0);
    if (!cleanItems.length) {
      setError("Adicione ao menos um item com nome.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalized,
          customerName: customerName.trim(),
          items: cleanItems,
          deliveryFee: parseMoneyInput(deliveryFee),
          address: address.trim(),
          notes: notes.trim(),
          sourceMessageId: initial?.sourceMessageId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar.");
        return;
      }
      router.push(`/pedidos/${data.order.id}`);
      router.refresh();
    } catch {
      setError("Sem conexão com o servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            WhatsApp do cliente *
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="11 99999-8888"
            inputMode="tel"
            className="w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          {phone && normalizePhone(phone).length >= 12 && (
            <p className="mt-1.5 text-[11px] text-ink-400">
              Será enviado para {formatPhone(normalizePhone(phone))}
            </p>
          )}

          <label className="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Nome do cliente
          </label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ex.: Dona Maria"
            className="w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          <label className="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Endereço de entrega
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, número, bairro"
            className="w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Taxa de entrega
          </label>
          <input
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className="w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          <label className="mb-1.5 mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            Observações
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Ex.: sem cebola, entregar depois das 18h…"
            className="w-full resize-none rounded-lg border border-ink-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          <div className="mt-4 flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Total
            </span>
            <span className="text-lg font-bold text-brand-600">{money(total)}</span>
          </div>
        </div>
      </div>

      <ItemsEditor items={items} onChange={setItems} />

      {error && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {submitLabel}
      </button>
    </form>
  );
}
