import { ORDER_STATUS, type OrderStatus } from "@/lib/repo";

export default function StatusBadge({ status }: { status: string }) {
  const meta = ORDER_STATUS[status as OrderStatus] ?? {
    label: status,
    tone: "bg-ink-200 text-ink-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.tone}`}
    >
      {meta.label}
    </span>
  );
}
