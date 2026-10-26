const amountFmt = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1842.37 -> "1842,37"  ·  12345.5 -> "12.345,50" */
export function money(n: number): string {
  return amountFmt.format(Number.isFinite(n) ? n : 0);
}

export function signedMoney(n: number, type: "EXPENSE" | "INCOME" | "TRANSFER"): string {
  if (type === "EXPENSE") return `-${money(n)}`;
  if (type === "INCOME") return `+${money(n)}`;
  return money(n);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Interpreta "27,90" o "27.90" como número. */
export function parseAmount(v: string): number {
  const clean = v.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number.parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

const MONTHS_SHORT = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dayGroupKey(iso: string): string {
  return dayKey(new Date(iso));
}

/** HOY · AYER · 14 OCT · 14 OCT 2025 */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return "HOY";
  if (dayKey(d) === dayKey(yesterday)) return "AYER";
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "Hoy · 14:20" */
export function dateTimeLabel(iso: string): string {
  const day = dayLabel(iso);
  const pretty = day === "HOY" ? "Hoy" : day === "AYER" ? "Ayer" : day.charAt(0) + day.slice(1).toLowerCase();
  return `${pretty} · ${timeLabel(iso)}`;
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_LONG[month]} ${year}`;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month, 1, 0, 0, 0, 0);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Marca de "fraccionado" que se guarda al final de la descripción: "[Fraccionado 1/3 de 52,00 EUR]".
 * El importe del movimiento original es opcional (las marcas antiguas no lo llevan).
 */
const SPLIT_RE = /\s*\[Fraccionado (\d+)\/(\d+)(?: de ([\d.,]+ [A-Z]{3}))?\]\s*$/;

export function splitInfo(description?: string | null): { text: string; part?: number; total?: number; amount?: string } {
  const desc = description ?? "";
  const m = desc.match(SPLIT_RE);
  if (!m) return { text: desc };
  return { text: desc.replace(SPLIT_RE, ""), part: Number(m[1]), total: Number(m[2]), amount: m[3] };
}

export function withSplitMark(description: string, part: number, total: number, amount?: string): string {
  const text = splitInfo(description).text.trim();
  return `${text}${text ? " " : ""}[Fraccionado ${part}/${total}${amount ? ` de ${amount}` : ""}]`;
}
