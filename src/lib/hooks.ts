"use client";

import { useMemo } from "react";
import useSWR, { mutate } from "swr";
import { api } from "./api";
import { colorFor, defaultAccountIcon, knownIcon, normalizeIcon, safeColor } from "./icons";
import { kindOf, useMeta } from "./meta";
import type { Account, Category, CategoryKind, Movement, MovementFilters, TxFilters } from "./types";

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
 * El saldo viene del backend, que lo actualiza en cada gasto, ingreso, transferencia,
 * ajuste o importación por integración. Tras una mutación, refreshAll() lo vuelve a pedir.
 * Las importaciones llegan sin que la app haga nada, así que también se refresca
 * periódicamente y al volver a la app.
 */
export function useAccounts() {
  const meta = useMeta();
  const swr = useSWR("accounts", api.accounts, { refreshInterval: 30_000 });
  const accounts = useMemo<AccountView[]>(
    () =>
      (swr.data ?? [])
        .filter((a) => a.isActive !== false)
        .map((a) => {
          const m = meta.accounts[a.id];
          return {
            ...a,
            icon: knownIcon(a.icon) ?? m?.icon ?? defaultAccountIcon(a.type),
            color: (a.color && safeColor(a.color)) || m?.color || colorFor(a.id),
            balance: Number(a.balance ?? 0),
          };
        }),
    [swr.data, meta],
  );
  const total = useMemo(() => accounts.reduce((acc, a) => acc + a.balance, 0), [accounts]);
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  /** false hasta recibir las cuentas: así no se muestra un saldo 0 que no es real. */
  const loaded = swr.data !== undefined;
  return { ...swr, accounts, total, byId, loaded };
}

export function useCategories() {
  const meta = useMeta();
  const swr = useSWR("categories", api.categories);
  const categories = useMemo<CategoryView[]>(() => {
    const view = (c: Category, parent?: CategoryView): CategoryView => {
      const self: CategoryView = {
        ...c,
        // Las subcategorías usan el icono de su categoría y su propio color (un tono degradado).
        icon: parent?.icon ?? normalizeIcon(c.icon),
        color: c.color && /^#[0-9a-f]{6}$/i.test(c.color) ? safeColor(c.color) : (parent?.color ?? safeColor(c.color)),
        // El tipo viene de la API; el valor local solo cubre datos antiguos sin tipo.
        kind: c.type ?? parent?.kind ?? kindOf(meta, c),
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
  const { data } = useSWR("unclassified-count", () => api.transactions({ status: "UNCLASSIFIED", limit: 1 }), {
    refreshInterval: 30_000,
  });
  return data?.meta.total ?? 0;
}

/** Todos los movimientos de cuenta que cumplen el filtro (recorre las páginas). */
export function useMovements(filters: MovementFilters) {
  return useSWR(["movements", JSON.stringify(filters)], async () => {
    const out: Movement[] = [];
    for (let page = 1; page <= 20; page++) {
      const res = await api.movements({ ...filters, page, limit: 100 });
      out.push(...res.data);
      if (page >= res.meta.totalPages) break;
    }
    return out;
  });
}
