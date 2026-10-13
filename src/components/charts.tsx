"use client";

import { money } from "@/lib/format";

export interface Slice {
  id: string;
  name: string;
  amount: number;
  color: string;
}

const R = 76;
const STROKE = 30;
const C = 2 * Math.PI * R;

export function DonutChart({
  slices,
  total,
  label,
  onSelect,
}: {
  slices: Slice[];
  total: number;
  label: string;
  onSelect?: (id: string) => void;
}) {
  let offset = 0;
  const gap = slices.length > 1 ? 1.2 : 0;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[230px]">
      <svg viewBox="0 0 200 200" className="size-full -rotate-90" role="img" aria-label={`${label}: ${money(total)} EUR`}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth={STROKE} />
        {total > 0 &&
          slices.map((s) => {
            const len = (s.amount / total) * C;
            const dash = Math.max(len - gap, 0.6);
            const el = (
              <circle
                key={s.id}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                style={{ stroke: s.color, transition: "stroke-dasharray 500ms ease, stroke-dashoffset 500ms ease" }}
                className={onSelect ? "cursor-pointer transition-opacity hover:opacity-80" : ""}
                onClick={() => onSelect?.(s.id)}
              >
                <title>{`${s.name}: ${money(s.amount)} EUR`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="max-w-[60%] truncate text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">{label}</span>
        <span className="num mt-1 text-[26px] leading-none font-semibold">{money(total)}</span>
        <span className="mt-1 text-[11px] text-muted">EUR</span>
      </div>
    </div>
  );
}

export function StackedBar({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-surface-2">
      {total > 0 &&
        slices.map((s) => (
          <span
            key={s.id}
            title={`${s.name}: ${money(s.amount)} EUR`}
            className="h-full transition-[width] duration-500 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.amount / total) * 100}%`, background: s.color }}
          />
        ))}
    </div>
  );
}
