"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  Home,
  LogOut,
  MessageCircle,
  Settings2,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { AlarmProvider, useAlarm } from "./AlarmProvider";
import { formatPhone } from "@/lib/phone";
import type { AlarmKind } from "@/lib/sound";

const NAV = [
  { href: "/", label: "Painel", icon: Home },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/config", label: "Config", icon: Settings2 },
];

export default function AppShell({
  children,
  storeName,
  sound,
  enabled,
}: {
  children: React.ReactNode;
  storeName: string;
  sound: AlarmKind;
  enabled: boolean;
}) {
  return (
    <AlarmProvider sound={sound} enabled={enabled}>
      <ShellInner storeName={storeName}>{children}</ShellInner>
    </AlarmProvider>
  );
}

function ShellInner({ children, storeName }: { children: React.ReactNode; storeName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { unread, ringing, latest, dismiss, refresh } = useAlarm();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ink-50 lg:pl-60">
      {ringing && latest && (
        <div className="sticky top-0 z-50 flex items-center gap-3 bg-brand-500 px-4 py-2.5 text-white shadow-lg animate-alarm">
          <BellRing className="h-4 w-4 shrink-0" />
          <button
            onClick={() => {
              dismiss();
              router.push("/mensagens");
            }}
            className="min-w-0 flex-1 truncate text-left text-sm font-medium"
          >
            <strong>{latest.senderName || formatPhone(latest.phone)}</strong>:{" "}
            {latest.text.slice(0, 90) || "nova mensagem"} — toque para abrir
          </button>
          <button onClick={dismiss} aria-label="Fechar" className="rounded p-1 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-ink-200 bg-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 font-bold text-white">
            PP
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{storeName}</p>
            <p className="text-[11px] uppercase tracking-wide text-ink-400">
              CRM de pedidos
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                {href === "/mensagens" && unread > 0 && (
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${
                      active ? "bg-white text-brand-600" : "bg-brand-500 text-white"
                    }`}
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-200 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-xs font-bold text-white">
            PP
          </span>
          <span className="truncate text-sm font-bold">{storeName}</span>
        </div>
        <div className="hidden lg:block">
          <p className="text-sm font-semibold text-ink-800">{pathnameTitle(pathname)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            title="Atualizar"
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
          >
            Atualizar
          </button>
          <Link
            href="/pedidos/novo"
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
          >
            + Pedido
          </Link>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 lg:px-8 lg:pb-10">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-200 bg-white lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                active ? "text-brand-500" : "text-ink-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
              {href === "/mensagens" && unread > 0 && (
                <span className="absolute right-[22%] top-1 h-2 w-2 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function pathnameTitle(pathname: string): string {
  if (pathname === "/") return "Painel";
  if (pathname.startsWith("/mensagens")) return "Mensagens do WhatsApp";
  if (pathname.startsWith("/pedidos/novo")) return "Novo pedido";
  if (pathname.startsWith("/pedidos")) return "Pedidos";
  if (pathname.startsWith("/clientes")) return "Clientes";
  if (pathname.startsWith("/config")) return "Configurações";
  return "CRM";
}
