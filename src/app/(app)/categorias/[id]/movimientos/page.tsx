import { CategoryTransactionsScreen } from "@/components/CategoryTransactionsScreen";

/** Movimientos de una categoría o subcategoría. Se abre desde Inicio, no está en el menú. */
export default async function CategoryTransactionsPage({
  params,
  searchParams,
}: PageProps<"/categorias/[id]/movimientos">) {
  const { id } = await params;
  const { sub, tipo, cuenta } = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return (
    <CategoryTransactionsScreen
      categoryId={id}
      subcategoryId={one(sub)}
      kind={one(tipo) === "ingresos" ? "INCOME" : "EXPENSE"}
      accountId={one(cuenta)}
    />
  );
}
