import type { Settings } from "./db/schema";

export type TemplateName =
  | "templateConfirmado"
  | "templateACaminho"
  | "templateEntregue"
  | "templateCancelado";

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function orderSummary(
  items: { name: string; qty: number; price: number }[]
): string {
  return items.map((i) => `${i.qty}x ${i.name}`).join(", ");
}

export function buildMessage(
  s: Pick<
    Settings,
    "templateConfirmado" | "templateACaminho" | "templateEntregue" | "templateCancelado"
  >,
  which: TemplateName,
  vars: Record<string, string>
): string {
  return renderTemplate(s[which], vars);
}
