import { money } from "./format";

/**
 * Redondeo de cada parte al dividir una cuenta.
 *
 * Siempre hacia arriba al céntimo. Si los céntimos terminan en 8 o 9,
 * se sube a la siguiente décima. Así se cumplen los ejemplos pedidos:
 *   6,4816 -> 6,49 -> 6,50
 *   9,98   -> 10,00
 *   9,456  -> 9,46
 */
export function roundUpPart(value: number): number {
  let cents = Math.ceil(value * 100 - 1e-9);
  if (cents % 10 >= 8) cents = Math.ceil(cents / 10) * 10;
  return cents / 100;
}

/** Devuelve las n-1 partes nuevas. El movimiento actual se queda con el resto. */
export function suggestParts(total: number, people: number): number[] {
  if (people < 2 || total <= 0) return [];
  let part = roundUpPart(total / people);
  // Si el redondeo dejara el resto en negativo, se usa el redondeo simple al céntimo.
  if (remainderOf(total, Array(people - 1).fill(part)) <= 0) {
    part = Math.ceil((total / people) * 100 - 1e-9) / 100;
  }
  return Array(people - 1).fill(part);
}

export function remainderOf(total: number, parts: number[]): number {
  const cents = Math.round(total * 100) - parts.reduce((acc, p) => acc + Math.round(p * 100), 0);
  return cents / 100;
}

/* ---------- Concepto y descripción de las partes ---------- */

// Límite del backend (CreateTransactionDto).
const DESCRIPTION_MAX = 500;
/** Sitio que se reserva para la marca " [Fraccionado 50/50 de 1000000,00 EUR]" que se añade después. */
const MARK_ROOM = 40;

const DETAIL_HEADER = "Parte de un movimiento con un total de";

/** Descripción sin el detalle de la división, para usarla como título cuando no hay concepto. */
export function withoutSplitDetail(text: string | null | undefined): string {
  return (text ?? "").split(DETAIL_HEADER)[0].trim();
}

/**
 * Descripción de una parte: el texto que ya tuviera y el detalle de la división.
 *   Parte de un movimiento con un total de 52,00 EUR
 *   - 17,34 EUR (este)
 *   - 17,34 EUR
 *   - 17,32 EUR
 * `amounts` va en el orden de las partes y `index` señala la de este movimiento.
 * Sin la marca [Fraccionado n/n], que se añade aparte.
 */
export function splitDescription(
  text: string | null | undefined,
  amounts: number[],
  index: number,
  total: number,
  currency: string,
): string {
  const budget = DESCRIPTION_MAX - MARK_ROOM;
  const line = (amount: number, own: boolean) => `- ${money(amount)} ${currency}${own ? " (este)" : ""}`;
  const header = `${DETAIL_HEADER} ${money(total)} ${currency}`;
  let detail = [header, ...amounts.map((a, i) => line(a, i === index))].join("\n");
  if (detail.length > budget) {
    // Con muchas partes no cabe una línea por parte: se agrupan las demás por importe.
    const others = new Map<number, number>();
    amounts.forEach((a, i) => i !== index && others.set(a, (others.get(a) ?? 0) + 1));
    detail = [
      header,
      line(amounts[index], true),
      ...[...others].map(([a, count]) => `- ${count} × ${money(a)} ${currency}`),
    ].join("\n");
  }
  // Una división anterior dejó su propio detalle: se reemplaza.
  const base = (text ?? "").split(DETAIL_HEADER)[0].trim();
  if (!base) return detail;
  const room = budget - detail.length - 2;
  return room > 0 ? `${base.slice(0, room).trimEnd()}\n\n${detail}` : detail;
}
