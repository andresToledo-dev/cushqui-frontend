import { CategoriesScreen } from "@/components/CategoriesScreen";

export default async function CategoriesPage({ searchParams }: PageProps<"/categorias">) {
  const { tipo } = await searchParams;
  return <CategoriesScreen initialKind={tipo === "ingresos" ? "INCOME" : "EXPENSE"} />;
}
