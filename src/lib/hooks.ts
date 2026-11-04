"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type RefObject } from "react";
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

/** Estado de las pantallas de las que se salió abriendo un elemento de su lista, para recuperarlo al volver. */
const leftScreens = new Map<string, { positions: Map<string, number>; state?: unknown }>();

/** Al entrar desde el menú (o cerrar sesión) las pantallas empiezan de cero. */
export function forgetLeftScreens() {
  leftScreens.clear();
}

/** Lo que guardó la pantalla `id` al salir (pestaña, filtros…). Solo se puede leer al montarla. */
export function leftScreenState<T>(id: string): T | undefined {
  return leftScreens.get(id)?.state as T | undefined;
}

/**
 * Conserva el scroll de cada pestaña de la pantalla `id`, al cambiar de pestaña y al abrir un elemento y volver atrás.
 * Si se vuelve a entrar desde el menú, empieza arriba.
 * `key` identifica lo que muestra la lista y `ready` indica que ya está pintada, porque antes no se puede colocar.
 * `state` es lo que la pantalla necesita recuperar además del scroll.
 */
export function useTabScroll(id: string, listRef: RefObject<HTMLElement | null>, key: string, ready: boolean, state?: unknown) {
  const [left] = useState(() => leftScreens.get(id));
  const saved = useRef(left?.positions ?? new Map<string, number>());
  const restoring = useRef(left !== undefined);

  useEffect(() => {
    leftScreens.delete(id);
  }, [id]);

  useLayoutEffect(() => {
    if (!restoring.current || !ready || !listRef.current) return;
    listRef.current.scrollTop = saved.current.get(key) ?? 0;
    restoring.current = false;
  }, [listRef, key, ready]);

  /** Llamar justo antes de cambiar de pestaña. */
  const remember = useCallback(() => {
    saved.current.set(key, listRef.current?.scrollTop ?? 0);
    restoring.current = true;
  }, [listRef, key]);

  /** Llamar justo antes de navegar a un elemento de la lista. */
  const leave = useCallback(() => {
    saved.current.set(key, listRef.current?.scrollTop ?? 0);
    leftScreens.set(id, { positions: saved.current, state });
  }, [id, listRef, key, state]);

  /** Igual que `leave`, para los clics dentro de la lista: solo actúa si el clic abre un enlace. */
  const leaveOnLink = useCallback(
    (e: MouseEvent) => {
      if ((e.target as Element).closest("a")) leave();
    },
    [leave],
  );

  return { remember, leave, leaveOnLink };
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
            visibleInList: a.visibleInList !== false,
            balanceVisible: a.balanceVisible !== false,
          };
        }),
    [swr.data, meta],
  );
  const total = useMemo(() => accounts.reduce((acc, a) => (a.balanceVisible ? acc + a.balance : acc), 0), [accounts]);
  /** Suma de todas las cuentas, también las que no cuentan en el balance total. */
  const realTotal = useMemo(() => accounts.reduce((acc, a) => acc + a.balance, 0), [accounts]);
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  /** false hasta recibir las cuentas: así no se muestra un saldo 0 que no es real. */
  const loaded = swr.data !== undefined;
  return { ...swr, accounts, total, realTotal, byId, loaded };
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

export function useIntegrations() {
  return useSWR("integrations", api.integrations);
}

export function useIntegration(id: string | null) {
  return useSWR(id ? ["integration", id] : null, () => api.integration(id!));
}

/** Solo se piden si el usuario es ADMIN: para el resto el backend responde 403. */
export function useInvitations(enabled: boolean) {
  return useSWR(enabled ? "invitations" : null, api.invitations);
}
