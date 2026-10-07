"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Bell,
  BellOff,
  Check,
  Copy,
  Loader2,
  Plug,
  RotateCcw,
  Save,
  Webhook,
} from "lucide-react";
import type { Settings } from "@/lib/db/schema";
import type { AlarmKind } from "@/lib/sound";
import { requestNotificationPermission } from "@/lib/sound";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("erro");
  return res.json();
};

type Feedback = { kind: "ok" | "err"; text: string } | null;

export default function ConfigPage() {
  const { data, mutate } = useSWR<{ settings: Settings; webhookUrl: string }>(
    "/api/config",
    fetcher
  );
  const [changes, setChanges] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Feedback>(null);
  const [testing, setTesting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [perm, setPerm] = useState("default");

  const form: Partial<Settings> = { ...(data?.settings ?? {}), ...changes };

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setChanges((c) => ({ ...c, [key]: value }));
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!data) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: body.error || "Falha ao salvar." });
        return;
      }
      setChanges({});
      await mutate(body, { revalidate: false });
      setMsg({ kind: "ok", text: "Configurações salvas." });
    } catch {
      setMsg({ kind: "err", text: "Sem conexão com o servidor." });
    } finally {
      setSaving(false);
    }
  }

  async function rotateSecret() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotateSecret: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: body.error || "Falha ao gerar nova URL." });
        return;
      }
      await mutate(body, { revalidate: false });
      setMsg({ kind: "ok", text: "Nova URL secreta gerada. Atualize o webhook na UAZAPI." });
    } catch {
      setMsg({ kind: "err", text: "Sem conexão com o servidor." });
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/uazapi/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      setMsg(
        body.ok
          ? { kind: "ok", text: "Instância conectada." }
          : { kind: "err", text: body.error || "Falha na conexão." }
      );
    } catch {
      setMsg({ kind: "err", text: "Sem conexão com o servidor." });
    } finally {
      setTesting(false);
    }
  }

  async function registerWebhook() {
    setRegistering(true);
    setMsg(null);
    try {
      const res = await fetch("/api/uazapi/webhook", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      setMsg(
        body.ok
          ? { kind: "ok", text: `Webhook apontado para ${body.url}` }
          : { kind: "err", text: body.error || "Falha ao registrar." }
      );
    } catch {
      setMsg({ kind: "err", text: "Sem conexão com o servidor." });
    } finally {
      setRegistering(false);
    }
  }

  async function enableNotifications() {
    setPerm(await requestNotificationPermission());
  }

  async function copyUrl() {
    if (!data?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(data.webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const input =
    "w-full rounded-lg border border-ink-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <form onSubmit={save} className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Configurações</h1>
        <p className="text-sm text-ink-500">
          Conexão com o WhatsApp, alarme e mensagens automáticas.
        </p>
      </div>

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-brand-50 text-brand-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <Section title="Loja">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da loja">
            <input
              value={form.storeName ?? ""}
              onChange={(e) => set("storeName", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Taxa de entrega padrão (R$)">
            <input
              inputMode="decimal"
              value={String(form.deliveryFee ?? 0).replace(".", ",")}
              onChange={(e) =>
                set(
                  "deliveryFee",
                  String(
                    Number(
                      e.target.value.replace(/[^\d,.-]/g, "").replace(",", ".")
                    ) || 0
                  )
                )
              }
              className={input}
            />
          </Field>
        </div>
      </Section>

      <Section title="Alarme de pedido">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Som">
            <select
              value={form.alarmSound ?? "beep"}
              onChange={(e) => set("alarmSound", e.target.value as AlarmKind)}
              className={input}
            >
              <option value="beep">Bipe (3 toques)</option>
              <option value="chime">Sino</option>
              <option value="siren">Sirene</option>
              <option value="off">Sem som</option>
            </select>
          </Field>
          <div className="flex items-end gap-2 pb-1">
            <Toggle
              checked={form.alarmEnabled ?? true}
              onChange={(v) => set("alarmEnabled", v)}
              label="Alarme ligado"
            />
            <button
              type="button"
              onClick={enableNotifications}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-300 px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-100"
            >
              {perm === "granted" ? (
                <Bell className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <BellOff className="h-3.5 w-3.5" />
              )}
              {perm === "granted" ? "Notificações ativas" : "Ativar notificações"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <Toggle
            checked={form.ignoreFromMe ?? true}
            onChange={(v) => set("ignoreFromMe", v)}
            label="Ignorar mensagens que eu envio"
          />
          <Toggle
            checked={form.ignoreGroups ?? true}
            onChange={(v) => set("ignoreGroups", v)}
            label="Ignorar grupos"
          />
        </div>
      </Section>

      <Section title="WhatsApp (UAZAPI)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="URL da instância">
            <input
              value={form.uazapiUrl ?? ""}
              onChange={(e) => set("uazapiUrl", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Token da instância">
            <input
              value={form.uazapiToken ?? ""}
              onChange={(e) => set("uazapiToken", e.target.value)}
              placeholder="Cole o token da sua instância"
              className={input}
            />
          </Field>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-300 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Testar conexão
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-ink-300 bg-ink-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-ink-800">
            <Webhook className="h-4 w-4" /> Webhook
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Cole esta URL no painel da UAZAPI ou clique no botão para registrar automaticamente.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-ink-700">
              {data.webhookUrl}
            </code>
            <button
              type="button"
              onClick={copyUrl}
              className="rounded-lg border border-ink-300 bg-white p-2 text-ink-600 hover:bg-ink-100"
              aria-label="Copiar URL"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={registerWebhook}
              disabled={registering}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {registering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Webhook className="h-4 w-4" />
              )}
              Registrar webhook
            </button>
            <button
              type="button"
              onClick={rotateSecret}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-300 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Gerar nova URL secreta
            </button>
          </div>
        </div>
      </Section>

      <Section title="Mensagens automáticas">
        <div className="mb-4 flex flex-wrap gap-4">
          <Toggle
            checked={form.notifyConfirmado ?? false}
            onChange={(v) => set("notifyConfirmado", v)}
            label="Avisar ao entrar em preparo"
          />
          <Toggle
            checked={form.notifyEntregue ?? false}
            onChange={(v) => set("notifyEntregue", v)}
            label="Avisar ao entregar"
          />
          <Toggle
            checked={form.notifyCancelado ?? false}
            onChange={(v) => set("notifyCancelado", v)}
            label="Avisar ao cancelar"
          />
        </div>

        <div className="space-y-4">
          <TemplateField
            label="Pedido confirmado / em preparo"
            value={form.templateConfirmado ?? ""}
            onChange={(v) => set("templateConfirmado", v)}
          />
          <TemplateField
            label="Saiu para entrega (obrigatório)"
            value={form.templateACaminho ?? ""}
            onChange={(v) => set("templateACaminho", v)}
          />
          <TemplateField
            label="Entregue"
            value={form.templateEntregue ?? ""}
            onChange={(v) => set("templateEntregue", v)}
          />
          <TemplateField
            label="Cancelado"
            value={form.templateCancelado ?? ""}
            onChange={(v) => set("templateCancelado", v)}
          />
        </div>

        <p className="mt-3 rounded-lg bg-ink-100 px-3 py-2 font-mono text-[11px] text-ink-600">
          Variáveis: {"{{nome}} {{pedido}} {{valor}} {{entrega}} {{telefone}}"}
        </p>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-bold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function TemplateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-y rounded-lg border border-ink-300 px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </Field>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm font-medium text-ink-700"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? "bg-brand-500" : "bg-ink-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      {label}
    </button>
  );
}
