"use client";

import { Check } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { AppIcon, COLORS, ICON_KEYS } from "@/lib/icons";
import { SectionLabel } from "./ui";

/** Iconos por página: 6 columnas × 5 filas. */
const PAGE = 30;
const PAGES = Array.from({ length: Math.ceil(ICON_KEYS.length / PAGE) }, (_, i) => ICON_KEYS.slice(i * PAGE, (i + 1) * PAGE));

/** Cuadrícula de iconos en páginas de 6×5 que se desplazan en horizontal, con puntos para cambiar de página. */
export function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (v: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [initialPage] = useState(() => Math.max(0, Math.floor(ICON_KEYS.indexOf(value) / PAGE)));
  const [page, setPage] = useState(initialPage);

  // Al abrir se muestra la página del icono elegido (p. ej. al editar una categoría).
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (box && initialPage > 0) box.scrollLeft = initialPage * box.clientWidth;
  }, [initialPage]);

  const goTo = (i: number) => {
    const box = scrollRef.current;
    box?.scrollTo({ left: i * box.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <SectionLabel>Icono</SectionLabel>
      <div
        ref={scrollRef}
        role="radiogroup"
        aria-label="Icono"
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {PAGES.map((keys, i) => (
          <div key={i} className="grid w-full shrink-0 snap-start grid-cols-6 grid-rows-5 gap-2.5">
            {keys.map((key) => {
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={key}
                  onClick={() => onChange(key)}
                  className="grid aspect-square place-items-center rounded-2xl border-2 transition active:scale-95"
                  style={
                    selected
                      ? { borderColor: color, background: `color-mix(in srgb, ${color} 16%, #0f0f12)`, color }
                      : { borderColor: "transparent", background: "var(--color-surface)", color: "rgba(241,239,233,.7)" }
                  }
                >
                  <AppIcon iconKey={key} className="size-5" strokeWidth={1.8} />
                </button>
              );
            })}
            {/* La última página se completa con huecos para que la caja no cambie de alto. */}
            {Array.from({ length: PAGE - keys.length }, (_, k) => (
              <span key={`empty-${k}`} aria-hidden className="aspect-square" />
            ))}
          </div>
        ))}
      </div>
      {PAGES.length > 1 && (
        <div className="mt-1.5 flex justify-center">
          {PAGES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Página ${i + 1} de iconos`}
              aria-current={i === page ? "true" : undefined}
              className="group grid h-7 place-items-center px-1"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === page ? "w-5 bg-cream" : "w-1.5 bg-cream/30 group-hover:bg-cream/50"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <SectionLabel>Color</SectionLabel>
      <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-3">
        {COLORS.map((c) => {
          const selected = c === value;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c}
              onClick={() => onChange(c)}
              className="grid size-11 place-items-center rounded-full transition active:scale-95"
              style={{
                background: c,
                boxShadow: selected ? `0 0 0 3px #09090b, 0 0 0 5px ${c}` : undefined,
              }}
            >
              {selected && <Check className="size-5 text-ink" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
