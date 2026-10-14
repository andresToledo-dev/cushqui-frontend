"use client";

import { useSyncExternalStore } from "react";
import { currentPeriod, type Period, type PeriodMode } from "./period";

/**
 * Periodo compartido por Inicio, Transacciones, el historial de movimientos y la lista
 * de una categoría: lo que eliges en una pantalla se mantiene al pasar a otra.
 * El periodo vive en sessionStorage (dura mientras la app está abierta) y el modo
 * (semana, mes o año) en localStorage, para recordarlo entre sesiones.
 */
const PERIOD_KEY = "cushqui.period";
const MODE_KEY = "cushqui.home.periodMode";

let state: Period | null = null;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT = currentPeriod("month");

function isPeriod(v: unknown): v is Period {
  const p = v as Period;
  return (
    !!p &&
    (p.mode === "week" || p.mode === "month" || p.mode === "year") &&
    Number.isInteger(p.year) &&
    Number.isInteger(p.month) &&
    Number.isInteger(p.week)
  );
}

function load(): Period {
  if (state) return state;
  try {
    const saved = JSON.parse(sessionStorage.getItem(PERIOD_KEY) ?? "null");
    if (isPeriod(saved)) return (state = saved);
    const mode = localStorage.getItem(MODE_KEY);
    if (mode === "week" || mode === "month" || mode === "year") return (state = currentPeriod(mode as PeriodMode));
  } catch {}
  return (state = currentPeriod("month"));
}

export function setPeriod(next: Period | ((p: Period) => Period)) {
  const value = typeof next === "function" ? next(load()) : next;
  state = value;
  try {
    sessionStorage.setItem(PERIOD_KEY, JSON.stringify(value));
    localStorage.setItem(MODE_KEY, value.mode);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePeriod(): [Period, typeof setPeriod] {
  const period = useSyncExternalStore(subscribe, load, () => SERVER_SNAPSHOT);
  return [period, setPeriod];
}
