"use client";

import { ChevronRight, Scissors } from "lucide-react";
import Link from "next/link";
import { signedMoney, splitInfo, timeLabel } from "@/lib/format";
import type { AccountView, CategoryView } from "@/lib/hooks";
import { NEUTRAL } from "@/lib/icons";
import type { Transaction } from "@/lib/types";
import { IconBadge } from "./ui";

/** Enlace por defecto: los movimientos sin clasificar se abren directamente en edición. */
export function txHref(tx: Transaction): string {
  return tx.status === "UNCLASSIFIED" ? `/transacciones/${tx.id}/editar` : `/transacciones/${tx.id}`;
}

export function TxRow({
  tx,
  href = txHref(tx),
  category,
  account,
}: {
  tx: Transaction;
  href?: string;
  category?: CategoryView;
  account?: AccountView;
}) {
  const unclassified = tx.status === "UNCLASSIFIED";
  const { text, total } = splitInfo(tx.description);
  const title = tx.merchant || text || category?.name || "Movimiento";
  const accountName = account?.name ?? tx.accountName ?? "Cuenta";

  const subtitle = unclassified
    ? accountName
    : [tx.categoryName ?? category?.name, tx.subcategoryName].filter(Boolean).join(" · ") || "Sin categoría";

  const meta = [timeLabel(tx.transactionDate), unclassified ? text || null : accountName].filter(Boolean).join(" · ");

  return (
    <Link
      href={href}
      className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3.5 transition hover:bg-surface/70 active:bg-surface"
    >
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
      <p className={`num shrink-0 font-semibold ${tx.type === "INCOME" ? "text-ok" : ""}`}>
        {signedMoney(tx.amount, tx.type)} <span className="text-xs font-normal text-muted">EUR</span>
      </p>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </Link>
  );
}
