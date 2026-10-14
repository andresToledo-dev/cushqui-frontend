/**
 * Periodo de la pantalla de inicio: una semana de un mes, un mes o un año.
 *
 * Las semanas son las del mes, de lunes a domingo, recortadas al mes.
 * Ejemplo, octubre de 2025 (empieza en miércoles):
 *   Semana 1: 01–05 · Semana 2: 06–12 · … · Semana 5: 27–31
 */
export type PeriodMode = "week" | "month" | "year";

export interface Period {
  mode: PeriodMode;
  year: number;
  /** 0 = enero. */
  month: number;
  /** Índice de la semana dentro del mes, desde 0. */
  week: number;
}

export interface WeekRange {
  index: number;
  start: Date;
  end: Date;
}

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const startOfDay = (y: number, m: number, d: number) => new Date(y, m, d, 0, 0, 0, 0);
const endOfDay = (y: number, m: number, d: number) => new Date(y, m, d, 23, 59, 59, 999);

export function weeksOfMonth(year: number, month: number): WeekRange[] {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weeks: WeekRange[] = [];
  let day = 1;
  while (day <= lastDay) {
    // getDay(): 0 = domingo. Días hasta el domingo de esta semana.
    const weekday = new Date(year, month, day).getDay();
    const toSunday = (7 - weekday) % 7;
    const endDay = Math.min(day + toSunday, lastDay);
    weeks.push({ index: weeks.length, start: startOfDay(year, month, day), end: endOfDay(year, month, endDay) });
    day = endDay + 1;
  }
  return weeks;
}

/** Semana del mes que contiene la fecha dada. */
export function weekIndexOf(date: Date): number {
  return weeksOfMonth(date.getFullYear(), date.getMonth()).findIndex((w) => date >= w.start && date <= w.end);
}

export function currentPeriod(mode: PeriodMode, now = new Date()): Period {
  return { mode, year: now.getFullYear(), month: now.getMonth(), week: weekIndexOf(now) };
}

/** Cambia el modo conservando el mes y el año elegidos. */
export function withMode(p: Period, mode: PeriodMode, now = new Date()): Period {
  if (mode !== "week") return { ...p, mode };
  const sameMonth = p.year === now.getFullYear() && p.month === now.getMonth();
  return { ...p, mode, week: sameMonth ? weekIndexOf(now) : 0 };
}

export function periodRange(p: Period): { from: Date; to: Date } {
  if (p.mode === "year") return { from: startOfDay(p.year, 0, 1), to: endOfDay(p.year, 11, 31) };
  if (p.mode === "month") {
    return { from: startOfDay(p.year, p.month, 1), to: endOfDay(p.year, p.month + 1, 0) };
  }
  const weeks = weeksOfMonth(p.year, p.month);
  const w = weeks[Math.min(p.week, weeks.length - 1)];
  return { from: w.start, to: w.end };
}

/** Avanza o retrocede un periodo. Las semanas pasan de un mes al siguiente. */
export function shiftPeriod(p: Period, delta: number): Period {
  if (p.mode === "year") return { ...p, year: p.year + delta };
  if (p.mode === "month") {
    const d = new Date(p.year, p.month + delta, 1);
    return { ...p, year: d.getFullYear(), month: d.getMonth() };
  }
  const weeks = weeksOfMonth(p.year, p.month);
  const next = p.week + delta;
  if (next >= 0 && next < weeks.length) return { ...p, week: next };
  const d = new Date(p.year, p.month + (delta > 0 ? 1 : -1), 1);
  const target = weeksOfMonth(d.getFullYear(), d.getMonth());
  return { ...p, year: d.getFullYear(), month: d.getMonth(), week: delta > 0 ? 0 : target.length - 1 };
}

export function containsNow(p: Period, now = new Date()): boolean {
  const { from, to } = periodRange(p);
  return now >= from && now <= to;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 01/10/2025 */
export function shortDate(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 01/10 */
export function dayMonth(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** "Semana 2 · Octubre 2025", "Octubre 2025" o "2025". */
export function periodLabel(p: Period): string {
  if (p.mode === "year") return String(p.year);
  const month = `${MONTHS[p.month]} ${p.year}`;
  return p.mode === "month" ? month : `Semana ${p.week + 1} · ${month}`;
}

/** "01/10/2025 - 31/10/2025" */
export function rangeLabel(p: Period): string {
  const { from, to } = periodRange(p);
  return `${shortDate(from)} - ${shortDate(to)}`;
}

/** "esta semana", "este mes", "este año". */
export function thisPeriodWord(mode: PeriodMode): string {
  return mode === "week" ? "esta semana" : mode === "month" ? "este mes" : "este año";
}
