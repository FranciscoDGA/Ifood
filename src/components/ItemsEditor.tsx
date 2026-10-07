"use client";

import { Plus, Trash2 } from "lucide-react";
import { money, parseMoneyInput } from "@/lib/money";

export type Item = { name: string; qty: number; price: number };

const SUGGESTIONS = [
  { name: "Pão caseiro (un)", price: 8 },
  { name: "Pão de fermentação natural", price: 22 },
  { name: "Pizza grande (35cm)", price: 45 },
  { name: "Pizza média (30cm)", price: 35 },
  { name: "Bolo de fubá (fatia)", price: 12 },
];

export default function ItemsEditor({
  items,
  onChange,
}: {
  items: Item[];
  onChange: (items: Item[]) => void;
}) {
  function update(index: number, patch: Partial<Item>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function add(preset?: { name: string; price: number }) {
    onChange([...items, preset ? { ...preset, qty: 1 } : { name: "", qty: 1, price: 0 }]);
  }

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900">Itens do pedido</h3>
        <span className="text-xs font-medium text-ink-500">
          Subtotal {money(subtotal)}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={item.name}
              onChange={(e) => update(index, { name: e.target.value })}
              placeholder="Ex.: Pizza grande"
              className="min-w-0 flex-1 rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <input
              type="number"
              min={1}
              value={item.qty}
              onChange={(e) => update(index, { qty: Math.max(1, Number(e.target.value) || 1) })}
              className="w-16 rounded-lg border border-ink-300 px-2 py-2 text-center text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <input
              inputMode="decimal"
              value={item.price ? String(item.price).replace(".", ",") : ""}
              onChange={(e) => update(index, { price: parseMoneyInput(e.target.value) })}
              placeholder="0,00"
              className="w-24 rounded-lg border border-ink-300 px-2 py-2 text-right text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="rounded-lg p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-600"
              aria-label="Remover item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {!items.length && (
          <p className="rounded-lg bg-ink-50 px-3 py-4 text-center text-xs text-ink-500">
            Nenhum item ainda.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => add()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-100"
        >
          <Plus className="h-3.5 w-3.5" /> Item
        </button>
        {SUGGESTIONS.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => add(s)}
            className="rounded-full border border-dashed border-ink-300 px-2.5 py-1 text-[11px] text-ink-500 hover:border-brand-400 hover:text-brand-600"
          >
            {s.name} · {money(s.price)}
          </button>
        ))}
      </div>
    </div>
  );
}
