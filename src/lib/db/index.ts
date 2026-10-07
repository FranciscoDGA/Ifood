import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não definida. Conecte um banco Neon no painel da Vercel (Storage → Create → Neon)."
    );
  }
  return drizzle({ client: neon(url), schema });
}

export type Database = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { __db?: Database };

function instance(): Database {
  if (!globalForDb.__db) globalForDb.__db = createDb();
  return globalForDb.__db;
}

/**
 * Acesso preguiçoso ao banco: o cliente só é criado na primeira query, para que
 * `next build` consiga importar as rotas sem ter DATABASE_URL configurada.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const target = instance() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(target, prop, target);
    return typeof value === "function"
      ? (value as (...a: unknown[]) => unknown).bind(target)
      : value;
  },
  has(_target, prop) {
    return prop in (instance() as unknown as object);
  },
});
