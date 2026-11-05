"use client";

import { Check, ChevronRight, Scissors } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import { signedMoney, splitInfo, timeLabel } from "@/lib/format";
import type { AccountView, CategoryView } from "@/lib/hooks";
import { NEUTRAL } from "@/lib/icons";
import { withoutSplitDetail } from "@/lib/split";
import type { Transaction } from "@/lib/types";
import { IconBadge } from "./ui";

/** Enlace por defecto: los movimientos sin clasificar se abren directamente en edición. */
export function txHref(tx: Transaction): string {
  return tx.status === "UNCLASSIFIED" ? `/transacciones/${tx.id}/editar` : `/transacciones/${tx.id}`;
}

/**
 * Pulsación larga (dedo o ratón): llama a `onLongPress` a los 500 ms si el puntero no se ha movido,
 * para que hacer scroll no la active. Evita el clic que llega al soltar y el menú del enlace.
 */
function useLongPress(onLongPress?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!onLongPress) return {};
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      fired.current = false;
      origin.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        onLongPress();
      }, 500);
    },
    onPointerMove: (e: PointerEvent) => {
      const o = origin.current;
      if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 10) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onClickCapture: (e: MouseEvent) => {
      if (!fired.current) return;
      fired.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
  };
}

export function TxRow({
  tx,
  href = txHref(tx),
  category,
  account,
  selecting = false,
  selected = false,
  onLongPress,
  onToggle,
}: {
  tx: Transaction;
  href?: string;
  category?: CategoryView;
  account?: AccountView;
  /** Modo selección: la fila marca o desmarca en lugar de abrir el movimiento. */
  selecting?: boolean;
  selected?: boolean;
  onLongPress?: () => void;
  onToggle?: () => void;
}) {
  const press = useLongPress(onLongPress);
  const unclassified = tx.status === "UNCLASSIFIED";
  const split = splitInfo(tx.description);
  const { total, amount: originalTotal } = split;
  // El detalle de la división solo se ve en el detalle del movimiento, no en la fila.
  const text = withoutSplitDetail(split.text);
  const title = tx.merchant || text || category?.name || "Movimiento";
  const accountName = account?.name ?? tx.accountName ?? "Cuenta";

  const subtitle = unclassified
    ? accountName
    : [tx.categoryName ?? category?.name, tx.subcategoryName].filter(Boolean).join(" · ") || "Sin categoría";

  const meta = [timeLabel(tx.transactionDate), unclassified ? text || null : accountName].filter(Boolean).join(" · ");

  const content = (
    <>
      {unclassified ? (
        <IconBadge icon="card" color={NEUTRAL} />
      ) : (
        <IconBadge icon={category?.icon ?? "archive"} color={category?.color ?? NEUTRAL} />
      )}
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${unclassified ? "uppercase" : ""}`}>{title}</p>
        <p className="truncate text-sm text-cream/60">{subtitle}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-faint">
          {meta}
          {total && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-1.5 py-px text-[10px] font-semibold text-warn">
              <Scissors className="size-2.5" /> Fraccionado
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className={`num font-semibold ${tx.type === "INCOME" ? "text-ok" : ""}`}>
          {signedMoney(tx.amount, tx.type)} <span className="text-xs font-normal text-muted">EUR</span>
        </p>
        {total && originalTotal && (
          <span className="num rounded-full bg-warn/10 px-1.5 py-px text-[10px] font-semibold text-warn">
            de {originalTotal}
          </span>
        )}
      </div>
    </>
  );

  const rowClass = "-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3.5 transition hover:bg-surface/70 select-none [-webkit-touch-callout:none]";

  if (selecting) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={onToggle}
        className={`${rowClass} w-[calc(100%+1rem)] text-left`}
      >
        <span
          className={`grid size-5 shrink-0 place-items-center rounded-full border-2 transition ${
            selected ? "border-accent bg-accent text-ink" : "border-cream/60"
          }`}
        >
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
        {content}
      </button>
    );
  }

  return (
    <Link href={href} {...press} className={`${rowClass} active:bg-surface`}>
      {content}
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </Link>
  );
}
