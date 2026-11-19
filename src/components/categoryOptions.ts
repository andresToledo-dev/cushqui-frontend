import type { CategoryView } from "@/lib/hooks";
import type { CategoryKind } from "@/lib/types";
import type { SelectOption } from "./ui";

/** Categorías de un tipo con sus subcategorías anidadas. `keepId` se incluye aunque sea de otro tipo. */
export function categoryOptionsFor(categories: CategoryView[], kind: CategoryKind, keepId?: string | null): SelectOption[] {
  return categories
    .filter((c) => c.kind === kind || c.id === keepId)
    .flatMap((c) => [
      { value: c.id, label: c.name, icon: c.icon, color: c.color },
      ...c.subcategories.map((s) => ({
        value: s.id,
        label: s.name,
        icon: c.icon,
        color: c.color,
        indent: true,
        gradient: true,
        group: c.name,
      })),
    ]);
}

export function subcategoryOptionsFor(category?: CategoryView): SelectOption[] {
  return (category?.subcategories ?? []).map((s) => ({
    value: s.id,
    label: s.name,
    icon: s.icon,
    color: s.color,
    gradient: true,
  }));
}

/**
 * Lo que queda elegido al tocar una opción de la lista anidada: una subcategoría fija también su categoría,
 * y una categoría conserva la subcategoría solo si es suya.
 */
export function resolveCategoryPick(
  byId: Map<string, CategoryView>,
  value: string | null,
  currentSubcategoryId: string | null,
): { categoryId: string | null; subcategoryId: string | null } {
  const picked = value ? byId.get(value) : undefined;
  if (!picked) return { categoryId: null, subcategoryId: null };
  if (picked.parentId) return { categoryId: picked.parentId, subcategoryId: picked.id };
  return {
    categoryId: picked.id,
    subcategoryId: picked.subcategories.some((s) => s.id === currentSubcategoryId) ? currentSubcategoryId : null,
  };
}
