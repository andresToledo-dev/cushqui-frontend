"use client";

import { useMemo, useState } from "react";
import { useCategories } from "@/lib/hooks";
import type { CategoryKind } from "@/lib/types";
import { categoryOptionsFor, resolveCategoryPick, subcategoryOptionsFor } from "./categoryOptions";
import { Button, Modal, SectionLabel, SelectField } from "./ui";

/**
 * Elige la categoría y subcategoría para varios movimientos a la vez. El backend exige que la categoría sea
 * del tipo del movimiento, así que todos deben ser gastos o todos ingresos (`kind` null si se mezclan).
 */
export function BulkCategoryModal({
  open,
  count,
  kind,
  onClose,
  onApply,
}: {
  open: boolean;
  count: number;
  kind: CategoryKind | null;
  onClose: () => void;
  onApply: (categoryId: string, subcategoryId: string | null) => void;
}) {
  if (!open) return null;
  return <Body count={count} kind={kind} onClose={onClose} onApply={onApply} />;
}

function Body({
  count,
  kind,
  onClose,
  onApply,
}: {
  count: number;
  kind: CategoryKind | null;
  onClose: () => void;
  onApply: (categoryId: string, subcategoryId: string | null) => void;
}) {
  const { categories, byId } = useCategories();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);

  const options = useMemo(() => (kind ? categoryOptionsFor(categories, kind) : []), [categories, kind]);
  const category = categoryId ? byId.get(categoryId) : undefined;
  const subOptions = subcategoryOptionsFor(category);
  const label = count === 1 ? "1 movimiento" : `${count} movimientos`;

  return (
    <Modal open onClose={onClose} title="Cambiar categoría" subtitle={label} align="left">
      {!kind ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
          Los seleccionados mezclan gastos e ingresos. Selecciona solo gastos o solo ingresos para cambiar su categoría.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="min-w-0">
            <SectionLabel>Categoría</SectionLabel>
            <SelectField
              title="Categoría"
              value={categoryId}
              options={options}
              onChange={(v) => {
                const next = resolveCategoryPick(byId, v, subcategoryId);
                setCategoryId(next.categoryId);
                setSubcategoryId(next.subcategoryId);
              }}
              searchable
              compact
              placeholder="Categoría"
            />
          </div>
          <div className="min-w-0">
            <SectionLabel>Subcategoría</SectionLabel>
            <SelectField
              title="Subcategoría"
              value={subcategoryId}
              options={subOptions}
              onChange={setSubcategoryId}
              disabled={!category}
              allowClear
              searchable
              compact
              placeholder={category && subOptions.length === 0 ? "Sin subcategorías" : "Subcategoría"}
            />
          </div>
        </div>
      )}
      <Button className="mt-5 w-full" disabled={!kind || !categoryId} onClick={() => categoryId && onApply(categoryId, subcategoryId)}>
        Cambiar categoría
      </Button>
    </Modal>
  );
}
