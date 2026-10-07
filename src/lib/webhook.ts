export type ParsedWebhook = {
  eventType: string;
  instanceToken: string;
  raw: unknown;
  message:
    | {
        id: string;
        chatId: string;
        phone: string;
        senderName: string;
        text: string;
        type: string;
        fromMe: boolean;
        isGroup: boolean;
      }
    | null;
};

function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return "";
}

function pick(...values: unknown[]): string {
  for (const v of values) {
    const s = str(v);
    if (s) return s;
  }
  return "";
}

function findText(data: Record<string, unknown>): string {
  const direct = pick(data.body, data.text, data.caption, data.content, data.message);
  if (direct && typeof direct === "string") return direct;

  const inner = data.message;
  if (inner && typeof inner === "object") {
    const m = inner as Record<string, unknown>;
    const fromInner = pick(
      m.conversation,
      m.text,
      m.body,
      m.caption,
      (m.extendedTextMessage as Record<string, unknown> | undefined)?.text
    );
    if (fromInner) return fromInner;
  }

  const underscore = data._data;
  if (underscore && typeof underscore === "object") {
    const u = underscore as Record<string, unknown>;
    const inner2 = u.message;
    if (inner2 && typeof inner2 === "object") {
      const m2 = inner2 as Record<string, unknown>;
      return pick(
        m2.conversation,
        m2.text,
        m2.body,
        m2.caption,
        (m2.extendedTextMessage as Record<string, unknown> | undefined)?.text,
        (m2.imageMessage as Record<string, unknown> | undefined)?.caption,
        (m2.videoMessage as Record<string, unknown> | undefined)?.caption,
        (m2.ephemeralMessage as Record<string, unknown> | undefined)?.message
      );
    }
  }
  return "";
}

function keyOf(data: Record<string, unknown>): Record<string, unknown> {
  const key = data.key;
  if (key && typeof key === "object") return key as Record<string, unknown>;
  const u = data._data as Record<string, unknown> | undefined;
  const k = u?.key;
  if (k && typeof k === "object") return k as Record<string, unknown>;
  return {};
}

/**
 * UAZAPI muda pouco entre versões, então o parser aceita várias formas comuns
 * de payload em vez de travar em um shape exato.
 */
export function parseWebhook(payload: unknown): ParsedWebhook {
  const root =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const eventType = str(root.EventType ?? root.eventType ?? root.event) || "unknown";
  const instanceToken = pick(root.token, root.instanceToken, root.instance);

  const candidates: unknown[] = [root.message, root.data, root];
  let data: Record<string, unknown> = {};
  for (const c of candidates) {
    if (c && typeof c === "object") {
      const obj = c as Record<string, unknown>;
      if (obj.key || obj.from || obj.chatId || obj.chatid || obj.id) {
        data = obj;
        break;
      }
    }
  }
  if (!Object.keys(data).length && root.message && typeof root.message === "object") {
    data = root.message as Record<string, unknown>;
  }

  const key = keyOf(data);
  const rawId = pick(
    data.messageid,
    data.messageId,
    data.id,
    key.id,
    (data._data as Record<string, unknown> | undefined)?.id
  );
  const rawChat = pick(
    data.chatId,
    data.chatid,
    data.remoteJid,
    key.remoteJid,
    data.from,
    data.participant,
    (data._data as Record<string, unknown> | undefined)?.remoteJid
  );
  const fromMe = Boolean(
    data.fromMe ?? data.fromme ?? key.fromMe ?? key.fromme ?? false
  );
  const chat = rawChat || rawId;
  const isGroup =
    Boolean(data.isGroup ?? data.isgroup) || chat.includes("@g.us");

  const phoneSource = pick(
    data.from,
    data.participant,
    isGroup ? data.author : "",
    key.participant,
    chat,
    rawId
  );

  const type = pick(data.type, data.messageType, data.mimetype) || "text";
  const senderName = pick(
    data.pushName,
    data.pushname,
    data.senderName,
    data.contactName,
    data.notifyName
  );

  const looksLikeMessage = Boolean(rawId || rawChat || data.from);

  return {
    eventType,
    instanceToken,
    raw: payload,
    message: looksLikeMessage
      ? {
          id: rawId || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          chatId: chat,
          phone: phoneSource,
          senderName,
          text: findText(data),
          type,
          fromMe,
          isGroup,
        }
      : null,
  };
}
