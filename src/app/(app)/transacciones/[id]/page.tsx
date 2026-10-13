import { TransactionDetail } from "@/components/TransactionDetail";

export default async function TransactionDetailPage({ params }: PageProps<"/transacciones/[id]">) {
  const { id } = await params;
  return <TransactionDetail id={id} />;
}
