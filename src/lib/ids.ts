import { randomBytes, randomUUID } from "crypto";

export function newId(prefix = ""): string {
  const raw = randomUUID().replace(/-/g, "").slice(0, 20);
  return prefix ? `${prefix}_${raw}` : raw;
}

export function shortId(len = 12): string {
  return randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
}
