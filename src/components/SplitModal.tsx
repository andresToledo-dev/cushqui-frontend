"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { money, parseAmount } from "@/lib/format";
import { remainderOf, suggestParts } from "@/lib/split";
import { Button, Modal } from "./ui";

const MIN = 2;
const MAX = 50;

export function SplitModal({
  open,
  total,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  total: number;
  busy?: boolean;
  onClose: () => void;
  /** parts: importes de los movimientos nuevos. remainder: nuevo importe del movimiento actual. */
  onConfirm: (parts: number[], remainder: number) => void;
}) {
  if (!open) return null;
  return <SplitBody total={total} busy={busy} onClose={onClose} onConfirm={onConfirm} />;
}

function SplitBody({
  total,
  busy,
  onClose,
  onConfirm,
}: {
  total: number;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (parts: number[], remainder: number) => void;
}) {
  const [people, setPeople] = useState("2");
  const [parts, setParts] = useState<string[] | null>(null);

  const n = Math.min(MAX, Math.max(MIN, Number.parseInt(people, 10) || MIN));
  const setN = (v: number) => {
    setPeople(String(Math.min(MAX, Math.max(MIN, v))));
    setParts(null);
  };

  const generate = () => {
    setPeople(String(n));
    setParts(suggestParts(total, n).map((p) => money(p)));
  };

  const numbers = parts?.map(parseAmount) ?? [];
  const remainder = parts ? remainderOf(total, numbers) : 0;
  const invalidPart = numbers.some((p) => !(p > 0));
  const valid = parts !== null && !invalidPart && remainder > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Dividir cuenta"
      subtitle={`Monto ${money(total)} EUR · ¿Entre cuántas personas?`}
    >
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setN(n - 1)}
          disabled={n <= MIN}
          aria-label="Menos personas"
          className="grid size-11 place-items-center rounded-xl bg-surface-2 transition hover:bg-surface-3 disabled:opacity-40"
        >
          <Minus className="size-5" />
        </button>
        <input
          inputMode="numeric"
          aria-label="Número de personas"
          value={people}
          onChange={(e) => {
            setPeople(e.target.value.replace(/\D/g, "").slice(0, 2));
            setParts(null);
          }}
          onBlur={() => setPeople(String(n))}
          className="num h-14 w-24 rounded-2xl border border-line bg-surface text-center text-2xl font-semibold outline-none focus:border-cream/30"
        />
        <button
          onClick={() => setN(n + 1)}
          disabled={n >= MAX}
          aria-label="Más personas"
          className="grid size-11 place-items-center rounded-xl bg-surface-2 transition hover:bg-surface-3 disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
      </div>

      <Button className="mt-5 w-full" onClick={generate} disabled={!(total > 0)}>
        Generar cálculo
      </Button>
      {!(total > 0) && <p className="mt-2 text-center text-xs text-danger">Introduce primero un importe mayor que cero.</p>}

      {parts && (
        <div className="mt-4 animate-fade-in">
          <ul className="flex flex-col gap-2">
            {parts.map((p, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2.5">
                <span className="flex-1 text-sm">Movimiento {i + 1}</span>
                <input
                  inputMode="decimal"
                  aria-label={`Importe del movimiento ${i + 1}`}
                  value={p}
                  onChange={(e) => {
                    const next = [...parts];
                    next[i] = e.target.value.replace(/[^\d.,]/g, "");
                    setParts(next);
                  }}
                  className={`num h-10 w-28 rounded-xl border bg-bg px-3 text-right font-semibold text-warn outline-none focus:border-warn/50 ${
                    parseAmount(p) > 0 ? "border-line" : "border-danger"
                  }`}
                />
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-4">
              <span className="flex-1 text-sm">Movimiento {parts.length + 1} (actual)</span>
              <span className={`num pr-3 font-semibold ${remainder > 0 ? "text-ok" : "text-danger"}`}>{money(remainder)}</span>
            </li>
          </ul>
          {!valid && (
            <p className="mt-2 text-center text-xs text-danger">
              {invalidPart ? "Todos los importes deben ser mayores que cero." : "La suma supera el monto total."}
            </p>
          )}
          <Button className="mt-4 w-full" disabled={!valid || busy} onClick={() => onConfirm(numbers, remainder)}>
            {busy ? "Guardando…" : "Confirmar"}
          </Button>
        </div>
      )}
      <Button variant="ghost" className="mt-2 w-full" onClick={onClose}>
        Cancelar
      </Button>
    </Modal>
  );
}
