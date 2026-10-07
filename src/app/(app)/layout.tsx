import AppShell from "@/components/AppShell";
import { getSettings } from "@/lib/settings";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const settings = await getSettings();

  return (
    <AppShell
      storeName={settings.storeName}
      sound={settings.alarmSound as never}
      enabled={settings.alarmEnabled}
    >
      {children}
    </AppShell>
  );
}
