"use client";

import { Check } from "lucide-react";
import { AppIcon, COLORS, ICON_KEYS } from "@/lib/icons";
import { SectionLabel } from "./ui";

export function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (v: string) => void }) {
  return (
    <div>
      <SectionLabel>Icono</SectionLabel>
      <div role="radiogroup" aria-label="Icono" className="grid grid-cols-6 gap-2.5">
        {ICON_KEYS.map((key) => {
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
      </div>
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
