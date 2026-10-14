import { createElement } from "react";
import {
  Archive,
  Baby,
  Banknote,
  Briefcase,
  Bus,
  Car,
  Clapperboard,
  Coffee,
  CreditCard,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { AccountType } from "./types";

/** Iconos disponibles. La clave se guarda en la API, que admite como máximo 10 caracteres. */
export const ICONS: Record<string, LucideIcon> = {
  banknote: Banknote,
  archive: Archive,
  plane: Plane,
  card: CreditCard,
  utensils: Utensils,
  bus: Bus,
  house: House,
  bag: ShoppingBag,
  coffee: Coffee,
  cinema: Clapperboard,
  zap: Zap,
  wallet: Wallet,
  piggy: PiggyBank,
  landmark: Landmark,
  car: Car,
  fuel: Fuel,
  health: HeartPulse,
  education: GraduationCap,
  gift: Gift,
  briefcase: Briefcase,
  trending: TrendingUp,
  dumbbell: Dumbbell,
  paw: PawPrint,
  phone: Smartphone,
  shirt: Shirt,
  baby: Baby,
  receipt: Receipt,
};

export const ICON_KEYS = Object.keys(ICONS);

export const COLORS = [
  "#f472b6", // rosa
  "#facc15", // amarillo
  "#f97316", // naranja
  "#34d399", // verde
  "#60a5fa", // azul
  "#c084fc", // violeta
  "#f87171", // rojo
  "#2dd4bf", // turquesa
];

export const NEUTRAL = "#8d8d97";

export function colorFor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function defaultAccountIcon(type: AccountType): string {
  switch (type) {
    case "CASH":
      return "banknote";
    case "CARD":
      return "card";
    case "WALLET":
      return "wallet";
    case "SAVINGS":
      return "piggy";
    case "BANK":
      return "landmark";
    default:
      return "archive";
  }
}

export function accountTypeForIcon(icon: string): AccountType {
  switch (icon) {
    case "banknote":
      return "CASH";
    case "card":
      return "CARD";
    case "wallet":
      return "WALLET";
    case "piggy":
      return "SAVINGS";
    default:
      return "BANK";
  }
}

/** Traduce iconos antiguos (emoji o claves largas) a uno de la librería. */
const EMOJI_MAP: Record<string, string> = {
  "credit-card": "card",
  "shopping-bag": "bag",
  clapperboard: "cinema",
  "piggy-bank": "piggy",
  "heart-pulse": "health",
  "graduation-cap": "education",
  "trending-up": "trending",
  "paw-print": "paw",
  smartphone: "phone",
  food: "utensils",
  home: "house",
  "🍔": "utensils",
  "🏠": "house",
  "🛍️": "bag",
  "🎮": "cinema",
  "📦": "archive",
  "💰": "banknote",
  "💊": "health",
  "📱": "phone",
  "🚌": "bus",
  "✈️": "plane",
  dinero: "banknote",
};

export function resolveIcon(icon?: string | null): LucideIcon {
  if (!icon) return Tag;
  return ICONS[icon] ?? ICONS[EMOJI_MAP[icon] ?? ""] ?? Tag;
}

/** Devuelve la clave conocida del icono o null si no se reconoce. */
export function knownIcon(icon?: string | null): string | null {
  if (!icon) return null;
  if (ICONS[icon]) return icon;
  return EMOJI_MAP[icon] ?? null;
}

export function normalizeIcon(icon?: string | null): string {
  if (!icon) return "archive";
  if (ICONS[icon]) return icon;
  return EMOJI_MAP[icon] ?? "archive";
}

/**
 * Tono más claro de un color, para las subcategorías ("mismo color en degradado").
 * Cada posición usa una mezcla distinta con blanco para que se distingan en el gráfico.
 */
export function subcategoryShade(hex: string, index: number): string {
  const base = /^#[0-9a-f]{6}$/i.test(hex) ? hex : NEUTRAL;
  const amount = 0.18 + (index % 5) * 0.12;
  const channel = (i: number) => {
    const c = parseInt(base.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** Normaliza colores con poco contraste o en formato raro. */
export function safeColor(color?: string | null): string {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return NEUTRAL;
  return color.toLowerCase();
}

/** Renderiza un icono por su clave sin crear componentes durante el render. */
export function AppIcon({ iconKey, ...props }: { iconKey?: string | null } & LucideProps) {
  return createElement(resolveIcon(iconKey), props);
}
