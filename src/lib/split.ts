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
