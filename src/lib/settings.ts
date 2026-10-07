import { eq } from "drizzle-orm";
import { db } from "./db";
import { ensureSchema } from "./db/migrate";
import { settings, type Settings } from "./db/schema";
import { shortId } from "./ids";

export const DEFAULT_TEMPLATES = {
  templateConfirmado:
    "Olá {{nome}}! ✅ Seu pedido foi confirmado e já está na fila.\n\nPedido: {{pedido}}\nTotal: {{valor}}\n\nAssim que sair para entrega avisamos por aqui!",
  templateACaminho:
    "Olá {{nome}}! 🛵💨 Seu pedido está *a caminho*!\n\nPedido: {{pedido}}\nTotal: {{valor}}\nEntrega: {{entrega}}\n\nJá já chega aí. Bom apetite! 🍞🍕",
  templateEntregue:
    "Olá {{nome}}! ✨ Pedido *entregue*. Obrigado pela preferência! Volte sempre 🍞🍕",
  templateCancelado:
    "Olá {{nome}}, infelizmente seu pedido foi cancelado. Fale conosco se precisar de ajuda 💬",
};

export async function getSettings(): Promise<Settings> {
  await ensureSchema();
  const rows = await db.select().from(settings).where(eq(settings.id, "1")).limit(1);
  if (rows[0]) return rows[0];

  const created = await db
    .insert(settings)
    .values({
      id: "1",
      webhookSecret:
        process.env.WEBHOOK_SECRET || shortId(24),
      ...DEFAULT_TEMPLATES,
    })
    .onConflictDoNothing()
    .returning();

  if (created[0]) return created[0];
  const again = await db.select().from(settings).where(eq(settings.id, "1")).limit(1);
  if (!again[0]) throw new Error("Falha ao inicializar as configurações.");
  return again[0];
}

export async function updateSettings(
  patch: Partial<Omit<Settings, "id" | "updatedAt">>
): Promise<Settings> {
  await getSettings();
  const rows = await db
    .update(settings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(settings.id, "1"))
    .returning();
  return rows[0];
}
