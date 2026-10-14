"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { periodLabel, rangeLabel, shiftPeriod, withMode, type Period, type PeriodMode } from "@/lib/period";
import { PeriodPickerModal } from "./PeriodPickerModal";
import { Spinner } from "./ui";

const MODES: [PeriodMode, string][] = [
  ["week", "Semana"],
  ["month", "Mes"],
  ["year", "Año"],
];

/**
 * Filtro de fechas: botones Semana / Mes / Año y selector con flechas.
 * El intervalo de fechas solo se muestra en semana y mes.
 */
export function PeriodFilter({
  period,
  onChange,
  loading,
  action,
  className = "",
}: {
  period: Period;
  onChange: (p: Period) => void;
  /** Muestra un indicador mientras se cargan los datos del periodo. */
  loading?: boolean;
  /** Elemento a la derecha de los botones de modo (por ejemplo, cambiar de gráfico). */
  action?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label="Agrupar por" className="flex gap-1">
          {MODES.map(([mode, label]) => (
            <button
              key={mode}
              role="radio"
              aria-checked={period.mode === mode}
              onClick={() => onChange(withMode(period, mode))}
              className={`h-8 rounded-full px-3.5 text-xs font-semibold transition ${
                period.mode === mode
                  ? "bg-surface-3 text-cream ring-1 ring-cream/25"
                  : "text-muted hover:bg-surface hover:text-cream"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </div>

      <div className="mt-2 flex items-center gap-1">
        <button
          onClick={() => onChange(shiftPeriod(period, -1))}
          aria-label="Periodo anterior"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface hover:text-cream"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => setOpen(true)}
          aria-label="Elegir periodo"
          className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-2xl bg-surface px-3 py-1.5 transition hover:bg-surface-2"
        >
          <span className="flex max-w-full items-center gap-1.5 text-sm font-semibold">
            <span className="truncate">{periodLabel(period)}</span>
            {loading ? <Spinner className="size-3.5! border" /> : <ChevronDown className="size-4 shrink-0 text-muted" />}
          </span>
          {period.mode !== "year" && <span className="num text-[11px] text-muted">{rangeLabel(period)}</span>}
        </button>
        <button
          onClick={() => onChange(shiftPeriod(period, 1))}
          aria-label="Periodo siguiente"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface hover:text-cream"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <PeriodPickerModal open={open} value={period} onClose={() => setOpen(false)} onSelect={onChange} />
    </div>
  );
}
