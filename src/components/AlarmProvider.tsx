"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { notifyDesktop, playAlarm, type AlarmKind } from "@/lib/sound";

export type AlarmMessage = {
  id: string;
  phone: string;
  senderName: string;
  text: string;
  createdAt: number;
};

type AlarmContextValue = {
  unread: number;
  ringing: boolean;
  latest: AlarmMessage | null;
  sound: AlarmKind;
  enabled: boolean;
  dismiss: () => void;
  refresh: () => void;
};

const AlarmContext = createContext<AlarmContextValue | null>(null);

type PollData = {
  unread: number;
  serverTime: number;
  newMessages: AlarmMessage[];
};

const fetcher = async (url: string): Promise<PollData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha no alarme");
  return res.json();
};

function label(phone: string) {
  const d = phone.replace(/\D/g, "");
  const local = d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return phone;
}

export function AlarmProvider({
  children,
  sound,
  enabled,
}: {
  children: React.ReactNode;
  sound: AlarmKind;
  enabled: boolean;
}) {
  const sinceRef = useRef(0);
  const seen = useRef<Set<string>>(new Set());
  const [ringing, setRinging] = useState(false);
  const [latest, setLatest] = useState<AlarmMessage | null>(null);

  const { data, mutate } = useSWR<PollData>(
    "/api/alarm",
    fetcher,
    {
      refreshInterval: 4000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      keepPreviousData: true,
      onSuccess: (d) => {
        if (!d) return;

        // Primeira resposta só serve para fixar o ponto de partida.
        if (sinceRef.current === 0) {
          sinceRef.current = d.serverTime || Date.now();
          return;
        }

        const fresh = (d.newMessages ?? []).filter((m) => !seen.current.has(m.id));
        if (!fresh.length) return;

        fresh.forEach((m) => seen.current.add(m.id));
        sinceRef.current = Math.max(
          sinceRef.current,
          ...fresh.map((m) => m.createdAt)
        );

        const first = fresh[fresh.length - 1];
        setLatest(first);
        setRinging(true);

        if (enabled && sound !== "off") playAlarm(sound);
        notifyDesktop(
          `Nova mensagem de ${first.senderName || label(first.phone)}`,
          first.text.slice(0, 140) || "Mensagem recebida no WhatsApp"
        );
      },
    }
  );

  const unread = data?.unread ?? 0;

  const dismiss = useCallback(() => setRinging(false), []);
  const refresh = useCallback(() => { void mutate(); }, [mutate]);

  return (
    <AlarmContext.Provider
      value={{ unread, ringing, latest, sound, enabled, dismiss, refresh }}
    >
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarm(): AlarmContextValue {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm deve ser usado dentro de AlarmProvider");
  return ctx;
}
