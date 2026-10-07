import OrderForm from "@/components/OrderForm";

export const metadata = { title: "Novo pedido" };

export default async function NovoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : "";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Novo pedido</h1>
        <p className="text-sm text-ink-500">
          Digitado manualmente a partir do que o cliente pediu no WhatsApp.
        </p>
      </div>

      <OrderForm
        initial={{
          phone: one(sp.phone),
          customerName: one(sp.nome),
          address: one(sp.endereco),
          notes: one(sp.obs),
          sourceMessageId: one(sp.msg),
        }}
      />
    </div>
  );
}
