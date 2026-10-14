"use client";

import { Check, Scissors, Split, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { fromLocalInput, money, parseAmount, splitInfo, toLocalInput, withSplitMark } from "@/lib/format";
import { refreshAll, useAccounts, useCategories, useTransaction } from "@/lib/hooks";
import type { Transaction, TxInput } from "@/lib/types";
import { Screen } from "./AppShell";
import { HOME_ACCOUNT_KEY } from "@/lib/prefs";
import { SplitModal } from "./SplitModal";
import { useToast } from "./Toast";
import { BackHeader, Button, ConfirmModal, SectionLabel, SelectField, Spinner, Tabs, type SelectOption } from "./ui";

type Kind = "EXPENSE" | "INCOME";

function readHomeAccount(): string | null {
  try {
    return localStorage.getItem(HOME_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

export function TransactionForm({ id }: { id?: string }) {
  const { data: tx, error, isLoading } = useTransaction(id ?? null);
  if (id && (isLoading || (!tx && !error))) {
    return (
      <Screen>
        <div className="grid place-items-center py-24">
          <Spinner />
        </div>
      </Screen>
    );
  }
  if (id && !tx) {
    return (
      <Screen>
        <BackHeader title="Editar movimiento" backHref="/transacciones" />
        <p className="py-16 text-center text-muted">No se encontró el movimiento.</p>
      </Screen>
    );
  }
  return <FormBody key={tx?.id ?? "new"} tx={tx} />;
}

function FormBody({ tx }: { tx?: Transaction }) {
  const router = useRouter();
  const toast = useToast();
  const { accounts, byId: accountsById } = useAccounts();
  const { categories, byId: categoriesById } = useCategories();

  const original = splitInfo(tx?.description);
  const isNew = !tx;
  const wasUnclassified = tx?.status === "UNCLASSIFIED";

  const [type, setType] = useState<Kind>(tx?.type === "INCOME" ? "INCOME" : "EXPENSE");
  const [amount, setAmount] = useState(tx ? money(tx.amount) : "");
  const [accountId, setAccountId] = useState<string | null>(tx?.accountId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(tx?.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(tx?.subcategoryId ?? null);
  const [merchant, setMerchant] = useState(tx?.merchant ?? "");
  const [description, setDescription] = useState(original.text);
  const [date, setDate] = useState(toLocalInput(tx?.transactionDate ?? new Date().toISOString()));
  const [busy, setBusy] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Cuenta por defecto en movimientos nuevos.
  // Cuenta por defecto en movimientos nuevos: la elegida en Inicio; si es "Total", la primera.
  const [homeAccount] = useState(readHomeAccount);
  const effectiveAccountId =
    accountId ??
    (isNew ? ((homeAccount && accountsById.has(homeAccount) ? homeAccount : null) ?? accounts[0]?.id ?? null) : null);

  const category = categoryId ? categoriesById.get(categoryId) : undefined;

  const accountOptions: SelectOption[] = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    icon: a.icon,
    color: a.color,
    hint: `${money(a.balance)} EUR`,
  }));

  // Categorías del tipo actual con sus subcategorías anidadas.
  const categoryOptions = useMemo<SelectOption[]>(() => {
    const list = categories.filter((c) => c.kind === type || c.id === categoryId);
    return list.flatMap((c) => [
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
  }, [categories, type, categoryId]);

  const subOptions: SelectOption[] = (category?.subcategories ?? []).map((s) => ({
    value: s.id,
    label: s.name,
    icon: s.icon,
    color: s.color,
    gradient: true,
  }));

  const pickCategory = (value: string | null) => {
    const picked = value ? categoriesById.get(value) : undefined;
    if (!picked) {
      setCategoryId(null);
      setSubcategoryId(null);
    } else if (picked.parentId) {
      setCategoryId(picked.parentId);
      setSubcategoryId(picked.id);
    } else {
      setCategoryId(picked.id);
      if (!picked.subcategories.some((s) => s.id === subcategoryId)) setSubcategoryId(null);
    }
  };

  const amountNumber = parseAmount(amount);

  const buildPayload = (overrides: Partial<TxInput> = {}): TxInput | null => {
    if (!effectiveAccountId) {
      toast("Elige una cuenta. Si no tienes, créala en Cuentas.", "error");
      return null;
    }
    const value = overrides.amount ?? amountNumber;
    if (!(value >= 0.01)) {
      toast("El importe debe ser mayor que cero.", "error");
      return null;
    }
    const keepMark = original.total ? withSplitMark(description, original.part!, original.total) : description.trim();
    return {
      type,
      amount: Math.round(value * 100) / 100,
      accountId: effectiveAccountId,
      currency: accountsById.get(effectiveAccountId)?.currency ?? "EUR",
      merchant: merchant.trim() || undefined,
      description: keepMark,
      categoryId: categoryId ?? null,
      subcategoryId: subcategoryId ?? null,
      transactionDate: fromLocalInput(date),
      ...overrides,
    };
  };

  const toCreate = (p: TxInput): TxInput => ({
    ...p,
    categoryId: p.categoryId ?? undefined,
    subcategoryId: p.subcategoryId ?? undefined,
    description: p.description || undefined,
  });

  /** Crea o actualiza el movimiento actual. */
  const persist = async (payload: TxInput): Promise<Transaction> => {
    if (!tx) return api.createTransaction(toCreate(payload));
    if (wasUnclassified && payload.categoryId) await api.classify(tx.id, payload.categoryId);
    const patch: Partial<TxInput> = { ...payload };
    delete patch.currency;
    return api.updateTransaction(tx.id, patch);
  };

  const save = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setBusy(true);
    try {
      const saved = await persist(payload);
      await refreshAll();
      toast(isNew ? "Movimiento creado" : "Movimiento actualizado");
      router.replace(`/transacciones/${saved.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo guardar", "error");
      setBusy(false);
    }
  };

  const confirmSplit = async (parts: number[], remainder: number) => {
    const n = parts.length + 1;
    const base = buildPayload({ amount: remainder });
    if (!base) return;
    setBusy(true);
    try {
      let saved: Transaction;
      let source: Pick<TxInput, "type" | "accountId" | "currency" | "merchant" | "transactionDate">;
      let text: string;
      if (tx) {
        // Movimiento ya creado: solo cambia su importe (y la marca de fraccionado). El resto queda como estaba.
        text = original.text.trim();
        saved = await api.updateTransaction(tx.id, { amount: base.amount, description: withSplitMark(text, n, n) });
        source = {
          type: tx.type,
          accountId: tx.accountId,
          currency: tx.currency,
          merchant: tx.merchant || undefined,
          transactionDate: tx.transactionDate,
        };
      } else {
        text = description.trim();
        saved = await persist({ ...base, description: withSplitMark(text, n, n) });
        source = base;
      }
      // Las partes nuevas se crean sin categoría: quedan por clasificar.
      for (const [i, part] of parts.entries()) {
        await api.createTransaction({
          type: source.type,
          accountId: source.accountId,
          currency: source.currency,
          merchant: source.merchant,
          transactionDate: source.transactionDate,
          amount: part,
          description: withSplitMark(text, i + 1, n),
        });
      }
      await refreshAll();
      setSplitOpen(false);
      toast(`Se crearon ${parts.length} ${parts.length === 1 ? "movimiento" : "movimientos"} por clasificar`);
      router.replace(`/transacciones/${saved.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo dividir la cuenta", "error");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!tx) return;
    setBusy(true);
    try {
      await api.deleteTransaction(tx.id);
      await refreshAll();
      toast("Movimiento eliminado");
      router.replace("/transacciones");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo eliminar", "error");
      setBusy(false);
    }
  };

  const title = isNew ? "Nuevo movimiento" : wasUnclassified ? "Clasificar movimiento" : "Editar movimiento";
  const fieldClass =
    "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none placeholder:text-faint focus:border-cream/30";

  // Pantalla fija: todo cabe en el alto disponible y solo la descripción cede espacio.
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:px-6">
        <BackHeader
          title={<span className="block truncate">{title}</span>}
          action={
            <div className="-mr-2 flex items-center">
              {tx && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Eliminar movimiento"
                  className="grid size-10 place-items-center rounded-full text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-[18px]" />
                </button>
              )}
              <button
                onClick={save}
                disabled={busy}
                aria-label="Guardar"
                className="grid size-10 place-items-center rounded-full text-ok hover:bg-surface disabled:opacity-40"
              >
                <Check className="size-5" />
              </button>
            </div>
          }
        />

        <Tabs
          value={type}
          onChange={(k) => {
            setType(k);
            if (category && category.kind !== k) {
              setCategoryId(null);
              setSubcategoryId(null);
            }
          }}
          options={[
            { value: "EXPENSE", label: "Gasto" },
            { value: "INCOME", label: "Ingreso" },
          ]}
        />

        <label className="mt-3 flex shrink-0 items-baseline justify-center gap-2">
          <span className="sr-only">Importe</span>
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            autoFocus={isNew}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            onBlur={() => amount && setAmount(money(parseAmount(amount)))}
            size={Math.max(amount.length, 4)}
            className="num min-w-0 bg-transparent text-right text-5xl font-semibold outline-none placeholder:text-faint"
          />
          <span className="text-lg font-medium text-muted">EUR</span>
        </label>

        <div className="mt-2 flex shrink-0 items-center justify-center gap-2 border-b border-line pb-3">
          {original.total && (
            <span className="flex items-center gap-1.5 rounded-full bg-warn/10 px-2.5 py-1 text-xs font-semibold text-warn">
              <Scissors className="size-3.5" /> Parte {original.part} de {original.total}
            </span>
          )}
          <button
            type="button"
            onClick={() => setSplitOpen(true)}
            className="flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold transition hover:bg-surface-2"
          >
            <Split className="size-4" /> Dividir cuenta
          </button>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5">
          <div className="shrink-0">
            <SectionLabel className="mb-1 [@media(max-height:720px)]:hidden">Cuenta</SectionLabel>
            <SelectField title="Cuenta" value={effectiveAccountId} options={accountOptions} onChange={setAccountId} compact />
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2.5">
            <div className="min-w-0">
              <SectionLabel className="mb-1 [@media(max-height:720px)]:hidden">Categoría</SectionLabel>
              <SelectField
                title="Categoría"
                value={categoryId}
                options={categoryOptions}
                onChange={pickCategory}
                allowClear
                searchable
                compact
                placeholder="Categoría"
              />
            </div>
            <div className="min-w-0">
              <SectionLabel className="mb-1 [@media(max-height:720px)]:hidden">Subcategoría</SectionLabel>
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
          <div className="shrink-0">
            <SectionLabel className="mb-1 [@media(max-height:720px)]:hidden">Comercio o concepto</SectionLabel>
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Comercio o concepto"
              className={fieldClass}
            />
          </div>
          <div className="shrink-0">
            <SectionLabel className="mb-1 [@media(max-height:720px)]:hidden">Fecha</SectionLabel>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
          </div>
          <div className="shrink-0">
            <SectionLabel className="mb-1 [@media(max-height:720px)]:hidden">Descripción</SectionLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción"
              rows={2}
              className="no-scrollbar h-[4.75rem] w-full resize-none [@media(max-height:720px)]:h-12 rounded-2xl border border-line bg-surface px-4 py-2.5 text-base leading-6 outline-none placeholder:text-faint focus:border-cream/30"
            />
          </div>
        </div>

        <Button className="mt-3 w-full shrink-0" onClick={save} disabled={busy}>
          {busy ? "Guardando…" : "Guardar movimiento"}
        </Button>
      </div>

      <SplitModal
        open={splitOpen}
        total={amountNumber}
        busy={busy}
        onClose={() => setSplitOpen(false)}
        onConfirm={confirmSplit}
      />
      <ConfirmModal
        open={confirmDelete}
        title="¿Eliminar movimiento?"
        message="Esta acción no se puede deshacer."
        busy={busy}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
