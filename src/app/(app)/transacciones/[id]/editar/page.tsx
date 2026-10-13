import { TransactionForm } from "@/components/TransactionForm";

export default async function EditTransactionPage({ params }: PageProps<"/transacciones/[id]/editar">) {
  const { id } = await params;
  return <TransactionForm id={id} />;
}
