import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  storeName: text("store_name").notNull().default("Pão & Pizza"),
  uazapiUrl: text("uazapi_url").notNull().default("https://free.uazapi.com"),
  uazapiToken: text("uazapi_token").notNull().default(""),
  webhookSecret: text("webhook_secret").notNull().default(""),
  templateConfirmado: text("template_confirmado").notNull().default(
    "Olá {{nome}}! ✅ Seu pedido foi confirmado e já está na fila.\n\nPedido: {{pedido}}\nTotal: {{valor}}\n\nAssim que sair para entrega avisamos por aqui!"
  ),
  templateACaminho: text("template_a_caminho").notNull().default(
    "Olá {{nome}}! 🛵💨 Seu pedido está *a caminho*!\n\nPedido: {{pedido}}\nTotal: {{valor}}\nEntrega: {{entrega}}\n\nJá já chega aí. Bom apetite! 🍞🍕"
  ),
  templateEntregue: text("template_entregue").notNull().default(
    "Olá {{nome}}! ✨ Pedido *entregue*. Obrigado pela preferência! Volte sempre 🍞🍕"
  ),
  templateCancelado: text("template_cancelado").notNull().default(
    "Olá {{nome}}, infelizmente seu pedido foi cancelado. Fale conosco para ajudar 💬"
  ),
  notifyConfirmado: boolean("notify_confirmado").notNull().default(false),
  notifyEntregue: boolean("notify_entregue").notNull().default(false),
  notifyCancelado: boolean("notify_cancelado").notNull().default(false),
  alarmSound: text("alarm_sound").notNull().default("beep"),
  alarmEnabled: boolean("alarm_enabled").notNull().default(true),
  ignoreGroups: boolean("ignore_groups").notNull().default(true),
  ignoreFromMe: boolean("ignore_from_me").notNull().default(true),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    name: text("name").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("customers_phone_idx").on(t.phone)]
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    waMessageId: text("wa_message_id"),
    chatId: text("chat_id").notNull().default(""),
    phone: text("phone").notNull(),
    senderName: text("sender_name").notNull().default(""),
    text: text("text").notNull().default(""),
    type: text("type").notNull().default("text"),
    fromMe: boolean("from_me").notNull().default(false),
    isGroup: boolean("is_group").notNull().default(false),
    raw: jsonb("raw"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("messages_wa_id_idx").on(t.waMessageId),
    index("messages_read_idx").on(t.readAt),
    index("messages_created_idx").on(t.createdAt),
    index("messages_phone_idx").on(t.phone),
  ]
);

export const orderItems = jsonb("items").$type<
  { name: string; qty: number; price: number }[]
>();

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id"),
    phone: text("phone").notNull(),
    customerName: text("customer_name").notNull().default(""),
    items: orderItems.notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
    deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    address: text("address").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("novo"),
    waNotifyStatus: text("wa_notify_status"),
    waNotifyAt: timestamp("wa_notify_at", { withTimezone: true }),
    waNotifyError: text("wa_notify_error"),
    sourceMessageId: text("source_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_phone_idx").on(t.phone),
  ]
);

export type Settings = typeof settings.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = NonNullable<Order["items"]>[number];
