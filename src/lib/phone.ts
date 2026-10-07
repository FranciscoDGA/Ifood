/**
 * Normaliza qualquer forma de telefone vinda do WhatsApp para E.164 BR.
 * "5511999998888@s.whatsapp.net" -> "5511999998888"
 * "11 99999-8888"                -> "5511999998888"
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return "";
  let value = input.trim();

  const at = value.indexOf("@");
  if (at !== -1) value = value.slice(0, at);

  value = value.replace(/\D/g, "");
  if (!value) return "";

  if (value.startsWith("00")) value = value.slice(2);

  if (value.length <= 11) {
    value = `55${value}`;
  } else if (value.length === 12 && value.startsWith("55")) {
    // já está ok
  } else if (value.length > 13 && value.startsWith("55")) {
    // pode ter dígito extra; mantém os 13 primeiros (55 + DDD + 9 dígitos)
    value = value.slice(0, 13);
  }

  if (value.length < 12) return value;
  return value;
}

/** 5511999998888 -> (11) 99999-8888 */
export function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return e164;
}

export function waLink(phone: string, text?: string): string {
  const base = `https://wa.me/${phone}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
