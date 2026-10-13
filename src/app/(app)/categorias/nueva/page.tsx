import { CategoryForm } from "@/components/CategoryForm";

export default async function NewCategoryPage({ searchParams }: PageProps<"/categorias/nueva">) {
  const { tipo } = await searchParams;
  return <CategoryForm initialKind={tipo === "ingresos" ? "INCOME" : "EXPENSE"} />;
}
