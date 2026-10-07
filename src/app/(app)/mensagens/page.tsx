"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Send,
  ShoppingBag,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatPhone } from "@/lib/phone";

type InboxItem = {
  id: string;
  phone: string;
  senderName: string;
  text: string;
  fromMe: boolean;
  createdAt: string;
  unread: boolean;
  customerName: string;
  lastOrderId: string | null;
  lastOrderStatus: string | null;
};

type MessageRow = {
  id: string;
  phone: string;
  senderName: string;
  text: string;
  fromMe: boolean;
  createdAt: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("erro");
  return res.json();
};

export default function MensagensPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: inbox, mutate: mutateInbox } = useSWR<{ items: InboxItem[]; unread: number }>(
    "/api/mensagens",
    fetcher,
    { refreshInterval: 5000, keepPreviousData: true }
  );

  const { data: conv, mutate: mutateConv } = useSWR(
    selected ? `/api/mensagens/${encodeURIComponent(selected)}` : null,
    fetcher,
    { refreshInterval: 5000, keepPreviousData: true }
  );

  useEffect(() => {
    if (!selected) return;
    void fetch(`/api/mensagens/${encodeURIComponent(selected)}/read`, { method: "POST" }).then(
      () => mutateInbox()
    );
  }, [selected, mutateInbox]);

  const items = inbox?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Mensagens</h1>
        <p className="text-sm text-ink-500">
          Toda mensagem que chegar no WhatsApp dispara o alarme do painel.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Lista */}
        <div
          className={`overflow-hidden rounded-xl border border-ink-200 bg-white ${
            selected ? "hidden lg:block" : ""
          }`}
        >
          <div className="border-b border-ink-200 px-4 py-3">
            <p className="text-sm font-bold text-ink-900">Conversas</p>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-ink-500">
              Nenhuma conversa ainda.
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-ink-100 overflow-y-auto scroll-thin">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    onClick={() => setSelected(it.phone)}
                    className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-ink-50 ${
                      selected === it.phone ? "bg-brand-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                        {it.customerName || it.senderName || formatPhone(it.phone)}
                      </span>
                      {it.unread && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                    </div>
                    <span
                      className={`truncate text-xs ${it.fromMe ? "text-ink-400" : "text-ink-600"}`}
                    >
                      {it.fromMe ? "Você: " : ""}
                      {it.text || "(mensagem sem texto)"}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-ink-400">
                        {new Date(it.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {it.lastOrderStatus && (
                        <StatusBadge status={it.lastOrderStatus} />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Conversa */}
        <div
          className={`flex min-h-[60vh] flex-col overflow-hidden rounded-xl border border-ink-200 bg-white ${
            selected ? "" : "hidden lg:flex"
          }`}
        >
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <MessageCircle className="h-8 w-8 text-ink-300" />
              <p className="text-sm font-medium text-ink-600">
                Selecione uma conversa
              </p>
              <p className="text-xs text-ink-400">
                Ou aguarde o alarme — mensagens novas aparecem aqui.
              </p>
            </div>
          ) : (
            <Conversation
              phone={selected}
              conv={conv}
              onBack={() => setSelected(null)}
              onSent={() => {
                void mutateConv();
                void mutateInbox();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Conversation({
  phone,
  conv,
  onBack,
  onSent,
}: {
  phone: string;
  conv:
    | {
        display: string;
        customer: { name: string; notes: string } | null;
        items: MessageRow[];
      }
    | undefined;
  onBack: () => void;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => conv?.items ?? [], [conv]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, phone]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Falha ao enviar.");
        return;
      }
      setText("");
      onSent();
    } catch {
      setError("Sem conexão com o servidor.");
    } finally {
      setSending(false);
    }
  }

  const name =
    conv?.customer?.name || (messages.find((m) => !m.fromMe)?.senderName ?? "");

  return (
    <>
      <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink-900">
            {name || conv?.display || phone}
          </p>
          <p className="text-[11px] text-ink-400">{conv?.display ?? phone}</p>
        </div>
        <Link
          href={`/pedidos/novo?phone=${encodeURIComponent(phone)}&nome=${encodeURIComponent(name || "")}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Criar pedido
        </Link>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-ink-50 p-4 scroll-thin">
        {messages.length === 0 && (
          <p className="py-10 text-center text-xs text-ink-400">
            Sem mensagens nesta conversa.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                m.fromMe
                  ? "rounded-br-sm bg-wa text-white"
                  : "rounded-bl-sm border border-ink-200 bg-white text-ink-800"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.text || "📷 mídia"}</p>
              <p
                className={`mt-1 text-right text-[10px] ${
                  m.fromMe ? "text-white/70" : "text-ink-400"
                }`}
              >
                {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {error && (
        <p className="bg-brand-50 px-4 py-2 text-xs font-medium text-brand-700">{error}</p>
      )}

      <form onSubmit={send} className="flex items-center gap-2 border-t border-ink-200 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Responder pelo WhatsApp…"
          className="min-w-0 flex-1 rounded-full border border-ink-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="grid h-10 w-10 place-items-center rounded-full bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
          aria-label="Enviar"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </>
  );
}
