"use client";

import { Inbox, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { api } from "@/lib/api";
import { dayGroupKey, dayLabel } from "@/lib/format";
import { useAccounts, useCategories, useUnclassifiedCount } from "@/lib/hooks";
import type { Paginated, Transaction, TxFilters } from "@/lib/types";
import { Screen } from "./AppShell";
import { TxRow } from "./TxRow";
import { Button, EmptyState, Fab, Modal, SelectField, Spinner, Tabs } from "./ui";

export type TxTab = "gastos" | "ingresos" | "clasificar";
const PAGE = 30;

function filtersFor(tab: TxTab, accountId: string | null): TxFilters {
  const base: TxFilters = { accountId: accountId ?? undefined, limit: PAGE };
  if (tab === "clasificar") return { ...base, status: "UNCLASSIFIED" };
  return { ...base, status: "CLASSIFIED", type: tab === "gastos" ? "EXPENSE" : "INCOME" };
}

export function TransactionsScreen({ initialTab = "gastos" }: { initialTab?: TxTab }) {
  const [tab, setTab] = useState<TxTab>(initialTab);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const pending = useUnclassifiedCount();
  const { accounts, byId: accountsById } = useAccounts();
  const { byId: categoriesById } = useCategories();

  const filters = filtersFor(tab, accountId);
  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite<Paginated<Transaction>>(
    (index, prev) => {
      if (prev && index + 1 > prev.meta.totalPages) return null;
      return ["transactions-page", JSON.stringify(filters), index + 1];
    },
    ([, f, page]) => api.transactions({ ...JSON.parse(f as string), page: page as number }),
  );

  const items = useMemo(() => {
    const all = (data ?? []).flatMap((p) => p.data);
    return all.sort((a, b) => +new Date(b.transactionDate) - +new Date(a.transactionDate));
  }, [data]);
  const totalPages = data?.[0]?.meta.totalPages ?? 1;
  const hasMore = size < totalPages;

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of items) {
      const k = dayGroupKey(t.transactionDate);
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.values()];
  }, [items]);

  const filteredAccount = accountId ? accountsById.get(accountId) : undefined;

  return (
    <>
      <Screen>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">Actividad</p>
            <h1 className="font-display text-[32px] leading-tight font-semibold">Transacciones</h1>
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            aria-label="Filtrar"
            className={`relative grid size-11 place-items-center rounded-xl transition hover:bg-surface ${
              accountId ? "text-accent" : "text-cream/80"
            }`}
          >
            <SlidersHorizontal className="size-5" />
            {accountId && <span className="absolute top-2 right-2 size-2 rounded-full bg-accent" />}
          </button>
        </div>

        {filteredAccount && (
          <button
            onClick={() => setAccountId(null)}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-cream/80"
          >
            <span className="size-2 rounded-full" style={{ background: filteredAccount.color }} />
            {filteredAccount.name} · quitar filtro ✕
          </button>
        )}

        <Tabs
          className="mt-5"
          value={tab}
          onChange={setTab}
          options={[
            { value: "gastos", label: "Gastos" },
            { value: "ingresos", label: "Ingresos" },
            {
              value: "clasificar",
              label: (
                <>
                  Clasificar
                  {pending > 0 && (
                    <span className="grid min-w-5 place-items-center rounded-full bg-fab px-1.5 text-[11px] leading-5 font-bold text-ink">
                      {pending}
                    </span>
                  )}
                </>
              ),
            },
          ]}
        />

        {tab === "clasificar" && items.length > 0 && (
          <div className="mt-6 border-l-2 border-fab py-1 pl-4">
            <p className="text-lg font-semibold">
              {(pending || items.length) === 1 ? "Un movimiento espera categoría" : `${pending || items.length} movimientos esperan categoría`}
            </p>
            <p className="mt-0.5 text-sm text-muted">Selecciona uno para completar sus datos.</p>
          </div>
        )}

        <div className="mt-4">
          {isLoading && !data ? (
            <div className="grid place-items-center py-16">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-6" />}
              title={tab === "clasificar" ? "Todo clasificado" : "Sin movimientos"}
              text={
                tab === "clasificar"
                  ? "No hay movimientos pendientes de categoría."
                  : "Cuando registres movimientos aparecerán aquí agrupados por fecha."
              }
            />
          ) : (
            groups.map((group) => (
              <section key={dayGroupKey(group[0].transactionDate)} className="mt-4 first:mt-0">
                <div className="flex items-center justify-between py-2 text-xs">
                  <span className="font-semibold tracking-wide text-cream/70">{dayLabel(group[0].transactionDate)}</span>
                  <span className="text-faint">
                    {group.length} {group.length === 1 ? "movimiento" : "movimientos"}
                  </span>
                </div>
                <div className="divide-y divide-line">
                  {group.map((t) => (
                    <TxRow
                      key={t.id}
                      tx={t}
                      href={t.status === "UNCLASSIFIED" ? `/transacciones/${t.id}/editar` : `/transacciones/${t.id}`}
                      category={t.categoryId ? categoriesById.get(t.categoryId) : undefined}
                      account={accountsById.get(t.accountId)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          {hasMore && (
            <Button variant="secondary" className="mt-6 w-full" disabled={isValidating} onClick={() => setSize(size + 1)}>
              {isValidating ? "Cargando…" : "Cargar más"}
            </Button>
          )}
        </div>
      </Screen>
      <Fab />

      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtrar" align="left">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Cuenta</p>
        <SelectField
          title="Cuenta"
          value={accountId}
          allowClear
          placeholder="Todas las cuentas"
          options={accounts.map((a) => ({ value: a.id, label: a.name, icon: a.icon, color: a.color }))}
          onChange={setAccountId}
        />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setAccountId(null)}>
            Limpiar
          </Button>
          <Button onClick={() => setFilterOpen(false)}>Aplicar</Button>
        </div>
      </Modal>
    </>
  );
}
