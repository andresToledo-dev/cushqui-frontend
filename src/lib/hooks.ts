"use client";

import { useMemo } from "react";
import useSWR, { mutate } from "swr";
import { api } from "./api";
import { round2 } from "./format";
import { colorFor, defaultAccountIcon, knownIcon, normalizeIcon, safeColor } from "./icons";
import { kindOf, useMeta } from "./meta";
import type { Account, Category, CategoryKind, Transaction, TxFilters } from "./types";

export interface AccountView extends Omit<Account, "icon" | "color"> {
  icon: string;
  color: string;
  balance: number;
}

export interface CategoryView extends Category {
  icon: string;
  color: string;
  kind: CategoryKind;
  subcategories: CategoryView[];
}

/** Revalida todos los datos cacheados tras una mutación. */
export function refreshAll() {
  return mutate(() => true);
}

export function useMe() {
  return useSWR("me", api.me);
}

/**
 * Saldo de cada cuenta = saldo inicial + ingresos − gastos ± transferencias.
 * Se calcula aquí porque el `currentBalance` de la API se sobrescribe al editar una cuenta.
 */
function computeBalances(txs: Transaction[]): Map<string, number> {
  const delta = new Map<string, number>();
  const add = (id: string | undefined, v: number) => id && delta.set(id, (delta.get(id) ?? 0) + v);
  for (const t of txs) {
    if (t.type === "INCOME") add(t.accountId, t.amount);
    else if (t.type === "EXPENSE") add(t.accountId, -t.amount);
    else if (t.type === "TRANSFER") {
      add(t.accountId, -t.amount);
      add(t.toAccountId, t.amount);
    }
  }
  return delta;
}

export function useAccounts() {
  const meta = useMeta();
  const swr = useSWR("accounts", api.accounts);
  const { data: allTxs } = useSWR("transactions-all-balances", () => api.allTransactions());
  const accounts = useMemo<AccountView[]>(() => {
    const delta = allTxs ? computeBalances(allTxs) : null;
    return (swr.data ?? [])
      .filter((a) => a.isActive !== false)
      .map((a) => {
        const m = meta.accounts[a.id];
        const computed = delta ? round2((a.initialBalance ?? 0) + (delta.get(a.id) ?? 0)) : null;
        return {
          ...a,
          icon: knownIcon(a.icon) ?? m?.icon ?? defaultAccountIcon(a.type),
          color: (a.color && safeColor(a.color)) || m?.color || colorFor(a.id),
          balance: computed ?? a.currentBalance ?? a.initialBalance ?? 0,
        };
      });
  }, [swr.data, allTxs, meta]);
  const total = useMemo(() => accounts.reduce((acc, a) => acc + a.balance, 0), [accounts]);
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  return { ...swr, accounts, total, byId };
}

export function useCategories() {
  const meta = useMeta();
  const swr = useSWR("categories", api.categories);
  const categories = useMemo<CategoryView[]>(() => {
    const view = (c: Category, parent?: CategoryView): CategoryView => {
      const self: CategoryView = {
        ...c,
        icon: parent?.icon ?? normalizeIcon(c.icon),
        color: parent?.color ?? safeColor(c.color),
        kind: parent?.kind ?? kindOf(meta, c),
        subcategories: [],
      };
      self.subcategories = (c.subcategories ?? []).map((s) => view(s, self));
      return self;
    };
    return (swr.data ?? []).filter((c) => !c.parentId).map((c) => view(c));
  }, [swr.data, meta]);

  const byId = useMemo(() => {
    const map = new Map<string, CategoryView>();
    for (const c of categories) {
      map.set(c.id, c);
      for (const s of c.subcategories) map.set(s.id, s);
    }
    return map;
  }, [categories]);

  return { ...swr, categories, byId };
}

export function useTransactions(filters: TxFilters | null) {
  return useSWR(filters ? ["transactions-all", JSON.stringify(filters)] : null, () => api.allTransactions(filters!));
}

export function useTransaction(id: string | null) {
  return useSWR(id ? ["transaction", id] : null, () => api.transaction(id!));
}

export function useUnclassifiedCount() {
  const { data } = useSWR("unclassified-count", () => api.transactions({ status: "UNCLASSIFIED", limit: 1 }));
  return data?.meta.total ?? 0;
}
