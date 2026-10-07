import type { Settings } from "./db/schema";

export class UazapiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "UazapiError";
    this.status = status;
  }
}

function baseUrl(s: Pick<Settings, "uazapiUrl">): string {
  return (s.uazapiUrl || "https://free.uazapi.com").replace(/\/+$/, "");
}

async function call<T>(
  s: Pick<Settings, "uazapiUrl" | "uazapiToken">,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!s.uazapiToken) {
    throw new UazapiError("Token da instância UAZAPI não configurado.");
  }

  const res = await fetch(`${baseUrl(s)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      token: s.uazapiToken,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const detail =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : text.slice(0, 300);
    throw new UazapiError(`UAZAPI ${res.status}: ${detail}`, res.status);
  }

  return body as T;
}

export async function sendText(
  s: Pick<Settings, "uazapiUrl" | "uazapiToken">,
  number: string,
  text: string
): Promise<void> {
  await call(s, "/send/text", {
    method: "POST",
    body: JSON.stringify({ number, text, readchat: true }),
  });
}

export type WebhookEvents = Array<"messages" | "messages_update" | "connection">;

export async function configureWebhook(
  s: Pick<Settings, "uazapiUrl" | "uazapiToken">,
  url: string,
  events: WebhookEvents = ["messages", "messages_update", "connection"]
): Promise<unknown> {
  return call(s, "/webhook", {
    method: "POST",
    body: JSON.stringify({ url, events }),
  });
}

export async function getWebhook(
  s: Pick<Settings, "uazapiUrl" | "uazapiToken">
): Promise<unknown> {
  return call(s, "/webhook", { method: "GET" });
}

export async function getMe(
  s: Pick<Settings, "uazapiUrl" | "uazapiToken">
): Promise<{ id?: string; name?: string; pushname?: string } | null> {
  try {
    return await call(s, "/me", { method: "GET" });
  } catch {
    return null;
  }
}
