import { notFound } from "next/navigation";
import OrderDetail from "@/components/OrderDetail";
import { getOrder } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pedido" };

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(decodeURIComponent(id));
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <OrderDetail order={order} />
    </div>
  );
}
