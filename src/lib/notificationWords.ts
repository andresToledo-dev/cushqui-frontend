/**
 * Frases que marcan una notificación como gasto o ingreso.
 * El backend las guarda juntas, separadas por "," (expenseWords / incomeWords).
 */

export const MAX_PHRASES = 5;
export const MAX_WORDS = 4;
export const MAX_WORD_LENGTH = 15;
/** 4 palabras de 15 caracteres y sus espacios. 5 frases así caben de sobra en los 500 que admite el backend. */
export const MAX_PHRASE_LENGTH = MAX_WORDS * MAX_WORD_LENGTH + MAX_WORDS - 1;

const ALLOWED = /^[\p{L}\p{N} ]+$/u;

/** Quita espacios sobrantes: "  has   enviado " -> "has enviado". */
export function cleanPhrase(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Error de una frase o null si es válida. `others` son las frases ya usadas en los dos bloques
 * (sin la que se edita): una frase en ingreso y gasto a la vez haría el mensaje ambiguo.
 */
export function validatePhrase(text: string, others: string[]): string | null {
  const phrase = cleanPhrase(text);
  if (!phrase) return "Escribe una frase.";
  if (!ALLOWED.test(phrase)) return "Solo letras, números y espacios: sin comas ni caracteres especiales.";
  const words = phrase.split(" ");
  if (words.length > MAX_WORDS) return `Máximo ${MAX_WORDS} palabras por frase.`;
  if (words.some((w) => w.length > MAX_WORD_LENGTH)) return `Máximo ${MAX_WORD_LENGTH} caracteres por palabra.`;
  if (others.some((o) => o.toLowerCase() === phrase.toLowerCase())) return "Esa frase ya está en la lista de ingreso o gasto.";
  return null;
}

export function joinPhrases(phrases: string[]): string {
  return phrases.join(",");
}

export function splitPhrases(stored: string | null | undefined): string[] {
  return (stored ?? "").split(",").map(cleanPhrase).filter(Boolean);
}
