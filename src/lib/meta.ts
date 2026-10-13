"use client";

import { useSyncExternalStore } from "react";
import type { CategoryKind } from "./types";

/**
 * Datos que la API todavía no guarda:
 *  - icono y color de cada cuenta
 *  - si una categoría es de gastos o de ingresos
 * Se guardan en localStorage del navegador.
 */
interface MetaState {
  accounts: Record<string, { icon: string; color: string }>;
  categoryKinds: Record<string, CategoryKind>;
}

const KEY = "cushqui.meta.v1";
const EMPTY: MetaState = { accounts: {}, categoryKinds: {} };

let state: MetaState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
}

function save(next: MetaState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  load();
  return state;
}

export function useMeta(): MetaState {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function setAccountMeta(id: string, meta: { icon: string; color: string }) {
  load();
  save({ ...state, accounts: { ...state.accounts, [id]: meta } });
}

export function setCategoryKind(id: string, kind: CategoryKind) {
  load();
  save({ ...state, categoryKinds: { ...state.categoryKinds, [id]: kind } });
}

const INCOME_HINT = /salario|n[oó]mina|sueldo|ingreso|freelance|inter[eé]s|reembolso|dividend|bonus|venta/i;

export function kindOf(meta: MetaState, category: { id: string; name: string }): CategoryKind {
  return meta.categoryKinds[category.id] ?? (INCOME_HINT.test(category.name) ? "INCOME" : "EXPENSE");
}
