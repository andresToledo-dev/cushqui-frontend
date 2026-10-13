import { TransactionsScreen, type TxTab } from "@/components/TransactionsScreen";

export default async function TransactionsPage({ searchParams }: PageProps<"/transacciones">) {
  const { tab } = await searchParams;
  const initial: TxTab = tab === "clasificar" || tab === "ingresos" ? tab : "gastos";
  return <TransactionsScreen initialTab={initial} />;
}
