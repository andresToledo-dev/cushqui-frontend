"use client";

import { Tag, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { refreshAll } from "@/lib/hooks";
import type { CategoryKind, Transaction } from "@/lib/types";
import { BulkCategoryModal } from "./BulkCategoryModal";
import { useToast } from "./Toast";
import { ConfirmModal, Spinner } from "./ui";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type Progress = { action: "delete" | "category"; done: number; total: number };

/** Aplica `run` a cada id en serie (el backend no tiene operaciones en bloque) y devuelve los que fallaron. */
async function runInSeries(ids: string[], run: (id: string) => Promise<unknown>, onStep: (done: number) => void) {
  const failed: string[] = [];
  for (const [i, id] of ids.entries()) {
    try {
      await run(id);
    } catch {
      failed.push(id);
    }
    onStep(i + 1);
  }
  return failed;
}

/**
 * Selección de movimientos para borrarlos o cambiarles la categoría en bloque. Se activa con una pulsación larga.
 * `scope` identifica lo que muestra la lista (pestaña, periodo, filtros): si cambia, la selección se descarta.
 * `reload` recarga la lista si `refreshAll` no la cubre (las listas paginadas con useSWRInfinite).
 * `items` son los movimientos de la lista, para saber el tipo de los seleccionados.
 */
export function useTxSelection(scope: string, reload: (() => unknown) | undefined, items: Transaction[]) {
  const toast = useToast();
  const [state, setState] = useState<{ scope: string; ids: Set<string> } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [choosingCategory, setChoosingCategory] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  // Al cambiar de lista se descarta del todo: volver a la anterior no la recupera.
  if (state && state.scope !== scope) setState(null);
  const selected = state && state.scope === scope ? state.ids : null;
  const select = (ids: Set<string> | null) => setState(ids ? { scope, ids } : null);

  const toggle = (id: string) => {
    if (!selected) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    select(next);
  };

  /** Marca todos los movimientos del día; si ya lo estaban, los desmarca. */
  const toggleDay = (ids: string[]) => {
    if (!selected) return;
    const next = new Set(selected);
    const all = ids.every((id) => next.has(id));
    for (const id of ids) {
      if (all) next.delete(id);
      else next.add(id);
    }
    select(next);
  };

  /** Ejecuta la acción sobre los seleccionados con la pantalla de progreso. Los que fallan siguen seleccionados. */
  const runOnSelected = async (action: Progress["action"], run: (id: string) => Promise<unknown>) => {
    if (!selected) return;
    const ids = [...selected];
    setProgress({ action, done: 0, total: ids.length });
    const failed = await runInSeries(ids, run, (done) => setProgress({ action, done, total: ids.length }));
    await Promise.all([refreshAll(), reload?.()]);
    setProgress(null);
    const verb = action === "delete" ? ["eliminado", "eliminados", "eliminaron"] : ["actualizado", "actualizados", "actualizaron"];
    if (failed.length === 0) {
      select(null);
      toast(`${plural(ids.length, `movimiento ${verb[0]}`, `movimientos ${verb[1]}`)}`);
    } else {
      select(new Set(failed));
      toast(`Se ${verb[2]} ${ids.length - failed.length}; ${failed.length} no se pudieron ${action === "delete" ? "eliminar" : "actualizar"}`, "error");
    }
  };

  const remove = () => {
    setConfirming(false);
    return runOnSelected("delete", (id) => api.deleteTransaction(id));
  };

  const changeCategory = (categoryId: string, subcategoryId: string | null) => {
    setChoosingCategory(false);
    // PATCH con la categoría también clasifica los que estaban sin clasificar.
    return runOnSelected("category", (id) => api.updateTransaction(id, { categoryId, subcategoryId }));
  };

  // La categoría tiene que ser del tipo del movimiento: solo se puede elegir si todos son del mismo tipo.
  const kinds = new Set(items.filter((t) => selected?.has(t.id)).map((t) => t.type));
  const kind: CategoryKind | null = kinds.size === 1 ? [...kinds][0] : null;

  const count = selected?.size ?? 0;
  const dialogs = (
    <>
      <ConfirmModal
        open={confirming}
        title={`¿Eliminar ${plural(count, "movimiento", "movimientos")}?`}
        message="Se ajustará el saldo de sus cuentas. Esta acción no se puede deshacer."
        onConfirm={remove}
        onClose={() => setConfirming(false)}
      />
      <BulkCategoryModal
        open={choosingCategory}
        count={count}
        kind={kind}
        onClose={() => setChoosingCategory(false)}
        onApply={changeCategory}
      />
      {progress && <BulkProgress {...progress} />}
    </>
  );

  return {
    selected,
    start: (id: string) => select(new Set([id])),
    toggle,
    toggleDay,
    cancel: () => select(null),
    askDelete: () => setConfirming(true),
    askCategory: () => setChoosingCategory(true),
    dialogs,
  };
}

/** Cabecera del modo selección: cancelar, contador, cambiar categoría y borrar (más `extra`, p. ej. el filtro). */
export function SelectionBar({
  count,
  onCancel,
  onCategory,
  onDelete,
  extra,
}: {
  count: number;
  onCancel: () => void;
  onCategory: () => void;
  onDelete: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex h-11 items-center gap-2">
      <button
        onClick={onCancel}
        className="-ml-2 h-10 rounded-xl px-3 text-sm font-medium text-cream/80 transition hover:bg-surface hover:text-cream"
      >
        Cancelar
      </button>
      <p className="flex-1 truncate text-center text-[15px] font-semibold">
        {plural(count, "seleccionado", "seleccionados")}
      </p>
      <button
        onClick={onCategory}
        disabled={count === 0}
        aria-label="Cambiar categoría"
        className="grid size-11 place-items-center rounded-xl text-cream/80 transition hover:bg-surface hover:text-cream disabled:text-faint disabled:hover:bg-transparent"
      >
        <Tag className="size-5" />
      </button>
      <button
        onClick={onDelete}
        disabled={count === 0}
        aria-label="Eliminar seleccionados"
        className="grid size-11 place-items-center rounded-xl text-danger transition hover:bg-danger/10 disabled:text-faint disabled:hover:bg-transparent"
      >
        <Trash2 className="size-5" />
      </button>
      {extra}
    </div>
  );
}

/** Botón de la cabecera de un día para seleccionar o quitar todos sus movimientos. */
export function DayToggle({
  ids,
  selected,
  label,
  onToggle,
}: {
  ids: string[];
  selected: Set<string>;
  label: string;
  onToggle: (ids: string[]) => void;
}) {
  const all = ids.every((id) => selected.has(id));
  return (
    <button
      onClick={() => onToggle(ids)}
      aria-label={`${all ? "Quitar" : "Seleccionar"} movimientos del ${label}`}
      className="-my-1 rounded-lg px-2 py-1 font-semibold text-accent transition hover:bg-surface"
    >
      {all ? "Quitar" : "Seleccionar"}
    </button>
  );
}

/** Pantalla de carga mientras se borran o actualizan: no se puede cerrar. */
function BulkProgress({ action, done, total }: Progress) {
  const current = Math.min(done + 1, total);
  return (
    <div className="fixed inset-0 z-60 grid animate-fade-in place-items-center bg-black/70 px-6 backdrop-blur-[2px]">
      <div role="status" aria-live="polite" className="w-full max-w-xs rounded-3xl border border-line bg-[#0e0e11] p-6 text-center shadow-2xl">
        <Spinner className="size-8" />
        <p className="mt-4 font-semibold">
          {action === "delete" ? "Eliminando" : "Actualizando"} {current} de {total}…
        </p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-[width] ${action === "delete" ? "bg-danger" : "bg-accent"}`}
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
