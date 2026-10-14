"use client";

import { ArrowLeftRight, ArrowRight, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { dayGroupKey, dayLabel, money, timeLabel } from "@/lib/format";
import { useAccounts, useMovements } from "@/lib/hooks";
import { NEUTRAL } from "@/lib/icons";
import { periodRange } from "@/lib/period";
import { usePeriod } from "@/lib/period-store";
import type { Movement, MovementType } from "@/lib/types";
import { FixedScreen } from "./AppShell";
import { PeriodFilter } from "./PeriodFilter";
import { TransferModal } from "./TransferModal";
import { BackHeader, EmptyState, IconBadge, Spinner } from "./ui";

type TypeFilter = "ALL" | MovementType;

const TYPE_FILTERS: [TypeFilter, string][] = [
  ["ALL", "Todos"],
  ["TRANSFER", "Transferencias"],
  ["ADJUSTMENT", "Ajustes"],
  ["OPENING", "Aperturas"],
];

/** Historial de movimientos de cuenta: aperturas, ajustes y transferencias. */
export function TransfersScreen() {
  const [period, setPeriod] = usePeriod();
  const [type, setType] = useState<TypeFilter>("ALL");
  const { from, to } = periodRange(period);
  const { data, isLoading, isValidating } = useMovements({
    from: from.toISOString(),
    to: to.toISOString(),
    type: type === "ALL" ? undefined : type,
  });
  const { byId } = useAccounts();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Movement | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Movement[]>();
    for (const m of data ?? []) {
      const k = dayGroupKey(m.movementDate);
      map.set(k, [...(map.get(k) ?? []), m]);
    }
    return [...map.values()];
  }, [data]);

  return (
    <>
      <FixedScreen
        toggle={false}
        header={
          <div className="border-b border-line pb-3">
            <BackHeader
              title="Historial de movimientos"
              backHref="/cuentas"
              action={
                <button
                  onClick={() => setCreating(true)}
                  aria-label="Nueva transferencia"
                  className="-mr-2 grid size-10 place-items-center rounded-full text-accent hover:bg-surface"
                >
                  <Plus className="size-5" />
                </button>
              }
            />
            <PeriodFilter className="mt-1" period={period} onChange={setPeriod} loading={isValidating && !!data} />
            <div role="radiogroup" aria-label="Tipo de movimiento" className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto">
              {TYPE_FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={type === value}
                  onClick={() => setType(value)}
                  className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition ${
                    type === value ? "bg-cream text-ink" : "bg-surface text-muted hover:text-cream"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="mt-2">
          {isLoading && !data ? (
            <div className="grid place-items-center py-16">
              <Spinner />
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight className="size-6" />}
              title="Sin movimientos en este periodo"
              text="Aquí aparecen las aperturas de cuenta, los ajustes de saldo y las transferencias."
            />
          ) : (
            groups.map((g) => (
              <section key={dayGroupKey(g[0].movementDate)} className="mt-3 first:mt-0">
                <p className="py-2 text-xs font-semibold tracking-wide text-cream/70">{dayLabel(g[0].movementDate)}</p>
                <ul className="divide-y divide-line">
                  {g.map((m) => (
                    <li key={m.id}>
                      <MovementRow
                        movement={m}
                        fromIcon={byId.get(m.account.id)}
                        toIcon={m.toAccount ? byId.get(m.toAccount.id) : undefined}
                        onEdit={m.type === "TRANSFER" ? () => setEditing(m) : undefined}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </FixedScreen>
      <TransferModal open={creating} onClose={() => setCreating(false)} />
      <TransferModal open={editing !== null} transfer={editing ?? undefined} onClose={() => setEditing(null)} />
    </>
  );
}

type AccountLook = { icon: string; color: string } | undefined;

function MovementRow({
  movement: m,
  fromIcon,
  toIcon,
  onEdit,
}: {
  movement: Movement;
  fromIcon: AccountLook;
  toIcon: AccountLook;
  onEdit?: () => void;
}) {
  const time = timeLabel(m.movementDate);
  let title: React.ReactNode;
  let detail: string;
  let amount: React.ReactNode;

  if (m.type === "TRANSFER") {
    title = (
      <>
        <span className="truncate">{m.account.name}</span>
        <ArrowRight className="size-3.5 shrink-0 text-muted" />
        <span className="truncate">{m.toAccount?.name ?? "Cuenta"}</span>
      </>
    );
    detail = ["Transferencia", time, m.note].filter(Boolean).join(" · ");
    amount = money(m.amount);
  } else if (m.type === "ADJUSTMENT") {
    title = <span className="truncate">{m.account.name}</span>;
    const change =
      m.balanceBefore !== undefined && m.balanceAfter !== undefined
        ? `${money(m.balanceBefore)} → ${money(m.balanceAfter)}`
        : null;
    detail = ["Ajuste", time, change, m.note].filter(Boolean).join(" · ");
    amount = <span className={m.amount >= 0 ? "text-ok" : "text-danger"}>{`${m.amount >= 0 ? "+" : "-"}${money(Math.abs(m.amount))}`}</span>;
  } else {
    title = <span className="truncate">{m.account.name}</span>;
    detail = ["Apertura de cuenta", time, m.note].filter(Boolean).join(" · ");
    amount = money(m.amount);
  }

  const content = (
    <>
      {m.type === "TRANSFER" ? (
        <div className="flex shrink-0 items-center -space-x-2">
          <IconBadge icon={fromIcon?.icon ?? "archive"} color={fromIcon?.color ?? NEUTRAL} size="sm" className="ring-2 ring-bg" />
          <IconBadge icon={toIcon?.icon ?? "archive"} color={toIcon?.color ?? NEUTRAL} size="sm" className="ring-2 ring-bg" />
        </div>
      ) : (
        <IconBadge icon={fromIcon?.icon ?? "archive"} color={fromIcon?.color ?? NEUTRAL} size="sm" className="mr-8" />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 font-semibold">{title}</p>
        <p className="truncate text-xs text-faint">{detail}</p>
      </div>
      <p className="num shrink-0 font-semibold">
        {amount} <span className="text-xs font-normal text-muted">{m.currency}</span>
      </p>
      {onEdit && <ChevronRight className="size-4 shrink-0 text-faint" />}
    </>
  );

  return onEdit ? (
    <button
      onClick={onEdit}
      aria-label="Editar transferencia"
      className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition hover:bg-surface/70"
    >
      {content}
    </button>
  ) : (
    <div className="flex items-center gap-3 py-3.5">{content}</div>
  );
}
