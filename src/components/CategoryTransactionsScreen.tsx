"use client";

import { Inbox } from "lucide-react";
import { useMemo } from "react";
import { dayGroupKey, dayLabel, money } from "@/lib/format";
import { useAccounts, useCategories, useTransactions } from "@/lib/hooks";
import { NEUTRAL } from "@/lib/icons";
import { periodRange } from "@/lib/period";
import { usePeriod } from "@/lib/period-store";
import type { Transaction, TxType } from "@/lib/types";
import { FixedScreen } from "./AppShell";
import { PeriodFilter } from "./PeriodFilter";
import { TxRow } from "./TxRow";
import { BackHeader, EmptyState, Fab, IconBadge, Spinner } from "./ui";

/** Valores de la URL para "Sin clasificar" y "Sin subcategoría". */
export const UNCLASSIFIED_ID = "sin-clasificar";
export const NO_SUBCATEGORY_ID = "sin-subcategoria";

/** Ruta de la lista de movimientos de una categoría o subcategoría. */
export function categoryTransactionsHref(opts: {
  categoryId: string | null;
  subcategoryId?: string | null;
  kind: TxType;
  accountId?: string | null;
}): string {
  const sp = new URLSearchParams({ tipo: opts.kind === "INCOME" ? "ingresos" : "gastos" });
  if (opts.subcategoryId !== undefined) sp.set("sub", opts.subcategoryId ?? NO_SUBCATEGORY_ID);
  if (opts.accountId) sp.set("cuenta", opts.accountId);
  return `/categorias/${opts.categoryId ?? UNCLASSIFIED_ID}/movimientos?${sp}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sum = (txs: Transaction[]) => txs.reduce((acc, t) => acc + t.amount, 0);

export function CategoryTransactionsScreen({
  categoryId,
  subcategoryId,
  kind,
  accountId,
}: {
  /** UNCLASSIFIED_ID para los movimientos sin categoría. */
  categoryId: string;
  /** undefined: toda la categoría. NO_SUBCATEGORY_ID: los que no tienen subcategoría. */
  subcategoryId?: string;
  kind: TxType;
  accountId?: string;
}) {
  const [period, setPeriod] = usePeriod();
  const { byId: categoriesById } = useCategories();
  const { byId: accountsById } = useAccounts();
  const unclassified = categoryId === UNCLASSIFIED_ID;
  const { from, to } = periodRange(period);

  const { data, isLoading, isValidating } = useTransactions({
    from: from.toISOString(),
    to: to.toISOString(),
    type: kind,
    accountId,
    // La API solo acepta UUID en categoryId; las categorías predeterminadas (p. ej. "cat-food")
    // se filtran en el cliente.
    ...(unclassified ? { status: "UNCLASSIFIED" as const } : UUID_RE.test(categoryId) ? { categoryId } : {}),
  });

  const txs = useMemo(() => {
    const list = (data ?? []).filter((t) => {
      if (t.type !== kind) return false;
      if (unclassified) return !t.categoryId;
      if (t.categoryId !== categoryId) return false;
      if (subcategoryId === undefined) return true;
      return subcategoryId === NO_SUBCATEGORY_ID ? !t.subcategoryId : t.subcategoryId === subcategoryId;
    });
    return list.sort((a, b) => +new Date(b.transactionDate) - +new Date(a.transactionDate));
  }, [data, kind, unclassified, categoryId, subcategoryId]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of txs) {
      const k = dayGroupKey(t.transactionDate);
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.values()];
  }, [txs]);

  const category = unclassified ? undefined : categoriesById.get(categoryId);
  const categoryName = unclassified ? "Sin clasificar" : (category?.name ?? txs[0]?.categoryName ?? "Categoría");
  const subName =
    subcategoryId === undefined
      ? null
      : subcategoryId === NO_SUBCATEGORY_ID
        ? "Sin subcategoría"
        : (categoriesById.get(subcategoryId)?.name ?? txs[0]?.subcategoryName ?? "Subcategoría");
  const title = subName ?? categoryName;
  const account = accountId ? accountsById.get(accountId) : undefined;
  const total = sum(txs);
  const kindWord = kind === "EXPENSE" ? "gastos" : "ingresos";

  return (
    <>
      <FixedScreen
        toggle={false}
        header={
          <div className="border-b border-line pb-3">
            <BackHeader title={<span className="block truncate">{title}</span>} backHref="/" />
            <div className="flex items-center gap-4 rounded-2xl bg-surface p-4">
              <IconBadge
                icon={unclassified ? "card" : (category?.icon ?? "archive")}
                color={category?.color ?? NEUTRAL}
                variant={subcategoryId && subcategoryId !== NO_SUBCATEGORY_ID ? "gradient" : "soft"}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-cream/70">
                  {subName ? `${categoryName} · ${subName}` : categoryName}
                  {account && ` · ${account.name}`}
                </p>
                <p className="num text-2xl font-semibold">
                  {data ? money(total) : "—"} <span className="text-sm font-medium text-muted">EUR</span>
                </p>
                <p className="text-xs text-faint">
                  {txs.length} {txs.length === 1 ? "movimiento" : "movimientos"} de {kindWord}
                </p>
              </div>
            </div>
            <PeriodFilter className="mt-3" period={period} onChange={setPeriod} loading={isValidating && !!data} />
          </div>
        }
      >
        {isLoading && !data ? (
          <div className="grid place-items-center py-14">
            <Spinner />
          </div>
        ) : txs.length === 0 ? (
          <EmptyState icon={<Inbox className="size-6" />} title="Sin movimientos en este periodo" />
        ) : (
          groups.map((group) => (
            <section key={dayGroupKey(group[0].transactionDate)} className="mt-3">
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="font-semibold tracking-wide text-cream/70">{dayLabel(group[0].transactionDate)}</span>
                <span className="num text-faint">{money(sum(group))} EUR</span>
              </div>
              <div className="divide-y divide-line">
                {group.map((t) => (
                  <TxRow
                    key={t.id}
                    tx={t}
                    category={t.categoryId ? categoriesById.get(t.categoryId) : undefined}
                    account={accountsById.get(t.accountId)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </FixedScreen>
      <Fab />
    </>
  );
}
