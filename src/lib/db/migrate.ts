import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * DDL idempotente, uma instrução por execução.
 *
 * O driver HTTP do Neon usa prepared statement, que NÃO aceita múltiplos
 * comandos no mesmo `execute` ("cannot insert multiple commands into a
 * prepared statement"), então cada statement roda isolado.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS settings (
    id text PRIMARY KEY,
    store_name text NOT NULL DEFAULT 'Pão & Pizza',
    uazapi_url text NOT NULL DEFAULT 'https://free.uazapi.com',
    uazapi_token text NOT NULL DEFAULT '',
    webhook_secret text NOT NULL DEFAULT '',
    template_confirmado text NOT NULL DEFAULT '',
    template_a_caminho text NOT NULL DEFAULT '',
    template_entregue text NOT NULL DEFAULT '',
    template_cancelado text NOT NULL DEFAULT '',
    notify_confirmado boolean NOT NULL DEFAULT false,
    notify_entregue boolean NOT NULL DEFAULT false,
    notify_cancelado boolean NOT NULL DEFAULT false,
    alarm_sound text NOT NULL DEFAULT 'beep',
    alarm_enabled boolean NOT NULL DEFAULT true,
    ignore_groups boolean NOT NULL DEFAULT true,
    ignore_from_me boolean NOT NULL DEFAULT true,
    delivery_fee numeric(10,2) NOT NULL DEFAULT '0',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id text PRIMARY KEY,
    phone text NOT NULL,
    name text NOT NULL DEFAULT '',
    notes text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone)`,
  `CREATE TABLE IF NOT EXISTS messages (
    id text PRIMARY KEY,
    wa_message_id text,
    chat_id text NOT NULL DEFAULT '',
    phone text NOT NULL,
    sender_name text NOT NULL DEFAULT '',
    text text NOT NULL DEFAULT '',
    type text NOT NULL DEFAULT 'text',
    from_me boolean NOT NULL DEFAULT false,
    is_group boolean NOT NULL DEFAULT false,
    raw jsonb,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS messages_wa_id_idx ON messages (wa_message_id)`,
  `CREATE INDEX IF NOT EXISTS messages_read_idx ON messages (read_at)`,
  `CREATE INDEX IF NOT EXISTS messages_created_idx ON messages (created_at)`,
  `CREATE INDEX IF NOT EXISTS messages_phone_idx ON messages (phone)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id text PRIMARY KEY,
    customer_id text,
    phone text NOT NULL,
    customer_name text NOT NULL DEFAULT '',
    items jsonb NOT NULL,
    total numeric(10,2) NOT NULL DEFAULT '0',
    delivery_fee numeric(10,2) NOT NULL DEFAULT '0',
    address text NOT NULL DEFAULT '',
    notes text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'novo',
    wa_notify_status text,
    wa_notify_at timestamptz,
    wa_notify_error text,
    source_message_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status)`,
  `CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at)`,
  `CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders (phone)`,
];

const globalForMigrate = globalThis as unknown as { __schemaReady?: Promise<void> };

async function runMigrations(): Promise<void> {
  // Serial e idempotente: se falhar no meio, a próxima chamada tenta de novo.
  for (const statement of STATEMENTS) {
    await db.execute(sql.raw(statement));
  }
}

export function ensureSchema(): Promise<void> {
  if (!globalForMigrate.__schemaReady) {
    globalForMigrate.__schemaReady = runMigrations().catch((err) => {
      globalForMigrate.__schemaReady = undefined;
      throw err;
    });
  }
  return globalForMigrate.__schemaReady;
}
