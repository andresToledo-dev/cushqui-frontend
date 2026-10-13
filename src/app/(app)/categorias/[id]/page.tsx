import { CategoryForm } from "@/components/CategoryForm";

export default async function EditCategoryPage({ params }: PageProps<"/categorias/[id]">) {
  const { id } = await params;
  return <CategoryForm id={id} />;
}
