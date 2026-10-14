"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { dayMonth, MONTHS, weeksOfMonth, type Period } from "@/lib/period";
import { Button, Modal } from "./ui";

const YEARS_BACK = 8;

/** Selector de semana, mes o año según el modo del periodo, como el de cuentas. */
export function PeriodPickerModal({
  open,
  value,
  onClose,
  onSelect,
}: {
  open: boolean;
  value: Period;
  onClose: () => void;
  onSelect: (p: Period) => void;
}) {
  if (!open) return null;
  return <PickerBody value={value} onClose={onClose} onSelect={onSelect} />;
}

interface Option {
  key: string;
  label: string;
  hint?: string;
  period: Period;
}

function PickerBody({ value, onClose, onSelect }: { value: Period; onClose: () => void; onSelect: (p: Period) => void }) {
  // Mes y año que se están viendo dentro del modal (para semanas y meses).
  const [view, setView] = useState({ year: value.year, month: value.month });
  const [choice, setChoice] = useState<Period>(value);

  const thisYear = new Date().getFullYear();
  let title = "Elegir año";
  let nav: { label: string; prev: () => void; next: () => void } | null = null;
  let options: Option[];

  if (value.mode === "week") {
    title = "Elegir semana";
    const shift = (delta: number) => {
      const d = new Date(view.year, view.month + delta, 1);
      setView({ year: d.getFullYear(), month: d.getMonth() });
    };
    nav = { label: `${MONTHS[view.month]} ${view.year}`, prev: () => shift(-1), next: () => shift(1) };
    options = weeksOfMonth(view.year, view.month).map((w) => ({
      key: `w${w.index}`,
      label: `Semana ${w.index + 1}`,
      hint: `${dayMonth(w.start)} – ${dayMonth(w.end)}`,
      period: { mode: "week", year: view.year, month: view.month, week: w.index },
    }));
  } else if (value.mode === "month") {
    title = "Elegir mes";
    nav = {
      label: String(view.year),
      prev: () => setView((v) => ({ ...v, year: v.year - 1 })),
      next: () => setView((v) => ({ ...v, year: v.year + 1 })),
    };
    options = MONTHS.map((name, i) => ({
      key: `m${i}`,
      label: name,
      period: { mode: "month", year: view.year, month: i, week: 0 },
    }));
  } else {
    const first = Math.min(thisYear - YEARS_BACK, value.year);
    const last = Math.max(thisYear, value.year);
    options = Array.from({ length: last - first + 1 }, (_, i) => last - i).map((y) => ({
      key: `y${y}`,
      label: String(y),
      period: { mode: "year", year: y, month: value.month, week: 0 },
    }));
  }

  const isChosen = (p: Period) =>
    p.mode === choice.mode &&
    p.year === choice.year &&
    (p.mode === "year" || p.month === choice.month) &&
    (p.mode !== "week" || p.week === choice.week);

  return (
    <Modal open onClose={onClose} title={title} align="left">
      {nav && (
        <div className="mb-2 flex items-center justify-between rounded-2xl bg-surface p-1">
          <button
            onClick={nav.prev}
            aria-label="Anterior"
            className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-cream"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="font-semibold">{nav.label}</span>
          <button
            onClick={nav.next}
            aria-label="Siguiente"
            className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-cream"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
      {value.mode !== "week" ? (
        // Meses y años en cuadrícula: los 12 meses caben sin desplazar.
        <div role="radiogroup" aria-label={title} className="grid grid-cols-3 gap-2">
          {options.map((o) => {
            const checked = isChosen(o.period);
            return (
              <button
                key={o.key}
                role="radio"
                aria-checked={checked}
                onClick={() => setChoice(o.period)}
                className={`h-11 rounded-xl text-sm font-medium transition ${
                  checked ? "bg-cream text-ink" : "bg-surface text-cream/85 hover:bg-surface-2"
                }`}
              >
                {value.mode === "month" ? o.label.slice(0, 3) : o.label}
              </button>
            );
          })}
        </div>
      ) : (
      <div role="radiogroup" aria-label={title} className="-mx-1 flex max-h-[50dvh] flex-col divide-y divide-line overflow-y-auto overscroll-none">
        {options.map((o) => {
          const checked = isChosen(o.period);
          return (
            <label key={o.key} className="flex cursor-pointer items-center gap-3 px-1 py-3.5">
              <input
                type="radio"
                name="period"
                checked={checked}
                onChange={() => setChoice(o.period)}
                className="peer sr-only"
              />
              <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-cream/60 peer-checked:border-cream peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                <span className={`size-2.5 rounded-full bg-cream transition ${checked ? "scale-100" : "scale-0"}`} />
              </span>
              <span className="flex-1 font-medium">{o.label}</span>
              {o.hint && <span className="num text-sm text-muted">{o.hint}</span>}
            </label>
          );
        })}
      </div>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={() => {
            onSelect(choice);
            onClose();
          }}
        >
          Seleccionar
        </Button>
      </div>
    </Modal>
  );
}
