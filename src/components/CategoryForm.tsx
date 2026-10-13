"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { refreshAll, useCategories, type CategoryView } from "@/lib/hooks";
import { COLORS } from "@/lib/icons";
import { setCategoryKind } from "@/lib/meta";
import type { CategoryKind } from "@/lib/types";
import { Screen } from "./AppShell";
import { ColorPicker, IconPicker } from "./IconColorPicker";
import { useToast } from "./Toast";
import { BackHeader, Button, ConfirmModal, IconBadge, Input, Modal, SectionLabel, Spinner, Tabs } from "./ui";

interface SubItem {
  id: string;
  name: string;
  pending?: boolean;
}

export function CategoryForm({ id, initialKind = "EXPENSE" }: { id?: string; initialKind?: CategoryKind }) {
  const { byId, isLoading } = useCategories();
  if (id) {
    const category = byId.get(id);
    if (!category) {
      return (
        <Screen>
          {isLoading ? (
            <div className="grid place-items-center py-24">
              <Spinner />
            </div>
          ) : (
            <>
              <BackHeader title="Editar categoría" backHref="/categorias" />
              <p className="py-16 text-center text-muted">No se encontró la categoría.</p>
            </>
          )}
        </Screen>
      );
    }
    return <Body key={category.id} category={category} initialKind={category.kind} />;
  }
  return <Body initialKind={initialKind} />;
}

function Body({ category, initialKind }: { category?: CategoryView; initialKind: CategoryKind }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "banknote");
  const [color, setColor] = useState(category?.color ?? COLORS[0]);
  const [kind, setKind] = useState<CategoryKind>(initialKind);
  const [pendingSubs, setPendingSubs] = useState<SubItem[]>([]);
  const [busy, setBusy] = useState(false);

  // Modal de subcategoría (crear / editar) y confirmación de borrado.
  const [subModal, setSubModal] = useState<{ id?: string; name: string } | null>(null);
  const [deleteSub, setDeleteSub] = useState<SubItem | null>(null);
  const [deleteCat, setDeleteCat] = useState(false);

  const subs: SubItem[] = category ? category.subcategories.map((s) => ({ id: s.id, name: s.name })) : pendingSubs;
  const kindLabel = kind === "INCOME" ? "Ingreso" : "Gasto";
  const backHref = `/categorias?tipo=${kind === "INCOME" ? "ingresos" : "gastos"}`;

  const saveSub = async () => {
    if (!subModal || !subModal.name.trim()) return;
    const subName = subModal.name.trim();
    if (!category) {
      setPendingSubs((xs) =>
        subModal.id
          ? xs.map((x) => (x.id === subModal.id ? { ...x, name: subName } : x))
          : [...xs, { id: `tmp-${Date.now()}`, name: subName, pending: true }],
      );
      setSubModal(null);
      return;
    }
    setBusy(true);
    try {
      if (subModal.id) await api.updateSubcategory(subModal.id, subName);
      else await api.createSubcategory(category.id, subName);
      await refreshAll();
      toast(subModal.id ? "Subcategoría actualizada" : "Subcategoría añadida");
      setSubModal(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo guardar", "error");
    } finally {
      setBusy(false);
    }
  };

  const removeSub = async () => {
    if (!deleteSub) return;
    if (!category) {
      setPendingSubs((xs) => xs.filter((x) => x.id !== deleteSub.id));
      setDeleteSub(null);
      return;
    }
    setBusy(true);
    try {
      await api.deleteCategory(deleteSub.id);
      await refreshAll();
      toast("Subcategoría eliminada");
      setDeleteSub(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo eliminar", "error");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const body = { name: name.trim(), icon, color };
      const saved = category ? await api.updateCategory(category.id, body) : await api.createCategory(body);
      setCategoryKind(saved.id, kind);
      for (const s of pendingSubs) await api.createSubcategory(saved.id, s.name);
      await refreshAll();
      toast(category ? "Categoría actualizada" : "Categoría creada");
      router.replace(backHref);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo guardar", "error");
      setBusy(false);
    }
  };

  const removeCategory = async () => {
    if (!category) return;
    setBusy(true);
    try {
      await api.deleteCategory(category.id);
      await refreshAll();
      toast("Categoría eliminada");
      router.replace(backHref);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo eliminar", "error");
      setBusy(false);
      setDeleteCat(false);
    }
  };

  return (
    <Screen>
      <BackHeader title={`${category ? "Editar" : "Nueva"} categoría · ${kindLabel}`} backHref={backHref} />

      <div className="mt-4 flex items-center gap-4">
        <IconBadge icon={icon} color={color} size="xl" />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la categoría"
          aria-label="Nombre de la categoría"
          autoFocus={!category}
          className="text-[17px]"
        />
      </div>

      {category && !category.userId && (
        <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-xs text-muted">
          Es una categoría predeterminada. Puede que el servidor no permita modificarla.
        </p>
      )}

      <div className="mt-7 flex flex-col gap-7">
        <div>
          <SectionLabel>Tipo</SectionLabel>
          <Tabs
            size="sm"
            value={kind}
            onChange={setKind}
            options={[
              { value: "EXPENSE", label: "Gasto" },
              { value: "INCOME", label: "Ingreso" },
            ]}
          />
        </div>
        <IconPicker value={icon} color={color} onChange={setIcon} />
        <ColorPicker value={color} onChange={setColor} />

        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <SectionLabel className="mb-0">Subcategorías</SectionLabel>
            <button
              onClick={() => setSubModal({ name: "" })}
              className="flex items-center gap-1 text-sm font-medium text-cream/80 hover:text-cream"
            >
              <Plus className="size-4" /> Añadir subcategoría
            </button>
          </div>
          {subs.length === 0 ? (
            <p className="rounded-2xl bg-surface py-5 text-center text-sm text-muted">Sin subcategorías</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface py-2.5 pr-2 pl-3">
                  <IconBadge icon={icon} color={color} size="sm" variant="gradient" />
                  <span className="flex-1 truncate font-medium">{s.name}</span>
                  <button
                    onClick={() => setSubModal({ id: s.id, name: s.name })}
                    aria-label={`Editar ${s.name}`}
                    className="grid size-10 place-items-center rounded-xl text-cream/70 hover:bg-surface-2 hover:text-cream"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => setDeleteSub(s)}
                    aria-label={`Eliminar ${s.name}`}
                    className="grid size-10 place-items-center rounded-xl text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Button className="mt-8 w-full" onClick={save} disabled={busy || !name.trim()}>
        {busy ? "Guardando…" : "Guardar categoría"}
      </Button>
      {category && (
        <button
          onClick={() => setDeleteCat(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-danger transition hover:bg-danger/10"
        >
          <Trash2 className="size-4" /> Eliminar categoría
        </button>
      )}

      <Modal
        open={subModal !== null}
        onClose={() => setSubModal(null)}
        title={subModal?.id ? "Editar subcategoría" : "Nueva subcategoría"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSub();
          }}
        >
          <Input
            autoFocus
            placeholder="Nombre"
            value={subModal?.name ?? ""}
            onChange={(e) => setSubModal((m) => (m ? { ...m, name: e.target.value } : m))}
          />
          <Button type="submit" className="mt-4 w-full" disabled={busy || !subModal?.name.trim()}>
            Guardar
          </Button>
          <Button type="button" variant="ghost" className="mt-1 w-full" onClick={() => setSubModal(null)}>
            Cancelar
          </Button>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteSub !== null}
        title="¿Eliminar subcategoría?"
        message={`Se eliminará "${deleteSub?.name}".`}
        busy={busy}
        onConfirm={removeSub}
        onClose={() => setDeleteSub(null)}
      />
      <ConfirmModal
        open={deleteCat}
        title="¿Eliminar categoría?"
        message={`Se eliminará "${category?.name}" y sus subcategorías.`}
        busy={busy}
        onConfirm={removeCategory}
        onClose={() => setDeleteCat(false)}
      />
    </Screen>
  );
}
