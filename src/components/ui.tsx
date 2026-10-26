"use client";

import { ArrowLeft, Check, ChevronDown, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { AppIcon } from "@/lib/icons";

/* ---------- Icono con fondo de color ---------- */

const SIZES = {
  xs: { box: "size-8 rounded-lg", icon: "size-4" },
  sm: { box: "size-10 rounded-xl", icon: "size-[18px]" },
  md: { box: "size-12 rounded-2xl", icon: "size-5" },
  lg: { box: "size-14 rounded-2xl", icon: "size-6" },
  xl: { box: "size-16 rounded-[20px]", icon: "size-7" },
};

export function IconBadge({
  icon,
  color,
  size = "md",
  variant = "soft",
  className = "",
}: {
  icon?: string | null;
  color: string;
  size?: keyof typeof SIZES;
  variant?: "soft" | "gradient";
  className?: string;
}) {
  const s = SIZES[size];
  const style: CSSProperties =
    variant === "gradient"
      ? {
          background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 45%, #1b1b1f))`,
          color: "#140d12",
        }
      : { background: `color-mix(in srgb, ${color} 16%, #0f0f12)`, color };
  return (
    <span className={`grid shrink-0 place-items-center ${s.box} ${className}`} style={style}>
      <AppIcon iconKey={icon} className={s.icon} strokeWidth={1.8} />
    </span>
  );
}

/* ---------- Botones ---------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" };

export function Button({ variant = "primary", className = "", ...props }: BtnProps) {
  const styles = {
    primary: "bg-cream text-ink hover:bg-white disabled:bg-surface-3 disabled:text-muted",
    secondary: "bg-surface-2 text-cream hover:bg-surface-3 border border-line",
    ghost: "text-muted hover:text-cream",
    danger: "text-danger hover:bg-danger/10",
  }[variant];
  return (
    <button
      {...props}
      className={`flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${styles} ${className}`}
    />
  );
}

export function Fab({ href = "/transacciones/nueva" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Nuevo movimiento"
      className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom,0px)+20px)] z-30 grid size-14 place-items-center rounded-full bg-fab text-ink shadow-lg shadow-fab/30 transition hover:scale-105 active:scale-95 lg:right-8 lg:bottom-8"
    >
      <Plus className="size-7" strokeWidth={2.2} />
    </Link>
  );
}

/* ---------- Pestañas segmentadas ---------- */

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "md";
  className?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="tablist"
      className={`relative grid rounded-2xl bg-surface p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-xl bg-cream transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ${
            size === "sm" ? "h-9 text-xs tracking-wide" : "h-11 text-sm"
          } ${o.value === value ? "text-ink" : "text-muted hover:text-cream"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  align = "center",
  fixedHeight,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  align?: "center" | "left";
  /** Alto fijo: el panel no encoge con el contenido (p. ej. al filtrar una búsqueda). */
  fixedHeight?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full animate-slide-up overflow-y-auto overscroll-none rounded-t-3xl border border-line bg-[#0e0e11] px-5 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] shadow-2xl sm:mx-4 sm:max-w-md sm:animate-pop-in sm:rounded-3xl sm:pb-6 ${
          fixedHeight ? "h-[88dvh] sm:h-[70dvh]" : "max-h-[88dvh]"
        }`}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-cream"
        >
          <X className="size-4.5" />
        </button>
        {(title || subtitle) && (
          <div className={`mb-5 pr-8 ${align === "center" ? "pl-8 text-center" : ""}`}>
            {title && <h2 className="font-display text-xl font-semibold">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={message}>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button className="bg-danger! text-ink!" disabled={busy} onClick={onConfirm}>
          {busy ? "…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------- Selector con icono ---------- */

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
  hint?: string;
  indent?: boolean;
  gradient?: boolean;
  /** Grupo al que pertenece (p. ej. la categoría de una subcategoría). Se muestra al buscar. */
  group?: string;
}

/** Minúsculas y sin tildes, para buscar "cafe" y encontrar "Cafés". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function SelectField({
  value,
  options,
  onChange,
  placeholder = "Seleccionar",
  title,
  disabled,
  allowClear,
  clearLabel = "Sin seleccionar",
  searchable,
  compact,
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (v: string | null) => void;
  placeholder?: string;
  title: string;
  disabled?: boolean;
  allowClear?: boolean;
  /** Texto de la opción que deja el campo vacío. */
  clearLabel?: string;
  /** Añade un buscador por nombre encima de la lista. */
  searchable?: boolean;
  /** Versión de 48 px de alto para formularios densos. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const q = normalize(query);
  const searching = searchable && q.length > 0;
  const visible = searching
    ? options.filter((o) => normalize(o.label).includes(q) || (o.group && normalize(o.group).includes(q)))
    : options;
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const pick = (v: string | null) => {
    onChange(v);
    close();
  };
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex w-full items-center rounded-2xl border border-line bg-surface text-left transition hover:border-surface-3 disabled:opacity-50 ${
          compact ? "h-12 gap-2 px-2" : "h-14 gap-3 px-3"
        }`}
      >
        {selected ? (
          <>
            {selected.icon && (
              <IconBadge
                icon={selected.icon}
                color={selected.color ?? "#8d8d97"}
                size={compact ? "xs" : "sm"}
                variant={selected.gradient ? "gradient" : "soft"}
              />
            )}
            <span className="flex-1 truncate font-medium">{selected.label}</span>
          </>
        ) : (
          <span className="flex-1 truncate pl-1 text-muted">{placeholder}</span>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </button>
      {/* Con buscador el alto es fijo: la lista no encoge al filtrar y los resultados no quedan bajo el teclado. */}
      <Modal open={open} onClose={close} title={title} align="left" fixedHeight={searchable}>
        {searchable && (
          <div className="sticky -top-6 z-10 -mx-5 -mt-2 bg-[#0e0e11] px-5 pt-2 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre"
                aria-label={`Buscar ${title.toLowerCase()}`}
                className="h-12 w-full rounded-2xl border border-line bg-surface pr-4 pl-10 text-base outline-none placeholder:text-faint focus:border-cream/30"
              />
            </div>
          </div>
        )}
        <ul className="-mx-2 flex flex-col">
          {allowClear && !searching && (
            <li>
              <button
                onClick={() => pick(null)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-muted hover:bg-surface"
              >
                {clearLabel}
              </button>
            </li>
          )}
          {visible.length === 0 && (
            <li className="px-2 py-6 text-center text-sm text-muted">
              {searching ? `Nada coincide con "${query.trim()}"` : "No hay opciones"}
            </li>
          )}
          {visible.map((o) => (
            <li key={o.value}>
              <button
                onClick={() => pick(o.value)}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-surface ${
                  o.indent && !searching ? "pl-9" : ""
                }`}
              >
                {o.icon && (
                  <IconBadge
                    icon={o.icon}
                    color={o.color ?? "#8d8d97"}
                    size={o.indent ? "xs" : "sm"}
                    variant={o.gradient ? "gradient" : "soft"}
                  />
                )}
                <span className={`flex-1 truncate ${o.indent && !searching ? "text-sm text-cream/85" : "font-medium"}`}>
                  {o.label}
                </span>
                {searching && o.group ? (
                  <span className="truncate text-xs text-muted">{o.group}</span>
                ) : (
                  o.hint && <span className="num text-sm text-muted">{o.hint}</span>
                )}
                {o.value === value && <Check className="size-4 text-ok" />}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}

/* ---------- Cabeceras ---------- */

export function BackHeader({
  title,
  backHref,
  action,
}: {
  title: ReactNode;
  backHref?: string;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex h-14 items-center gap-3">
      <button
        onClick={() => (backHref ? router.push(backHref) : router.back())}
        aria-label="Volver"
        className="-ml-2 grid size-10 place-items-center rounded-full text-cream/80 hover:bg-surface hover:text-cream"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h1 className="flex-1 truncate text-[15px] font-semibold">{title}</h1>
      {action}
    </div>
  );
}

export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase ${className}`}>{children}</p>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-14 w-full rounded-2xl border border-line bg-surface px-4 text-base text-cream placeholder:text-faint transition outline-none focus:border-cream/30 focus:bg-surface-2 ${props.className ?? ""}`}
    />
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-5 animate-spin rounded-full border-2 border-surface-3 border-t-cream ${className}`}
      aria-label="Cargando"
    />
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface text-muted">{icon}</span>
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-xs text-sm text-muted">{text}</p>}
    </div>
  );
}
