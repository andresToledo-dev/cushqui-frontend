"use client";

import { ArrowLeftRight, ArrowRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { dayGroupKey, dayLabel, money, timeLabel } from "@/lib/format";
import { useAccounts, useTransactions } from "@/lib/hooks";
import { NEUTRAL } from "@/lib/icons";
import type { Transaction } from "@/lib/types";
import { Screen } from "./AppShell";
import { TransferModal } from "./TransferModal";
import { BackHeader, EmptyState, IconBadge, Spinner } from "./ui";

export function TransfersScreen() {
  const { data, isLoading } = useTransactions({ type: "TRANSFER" });
  const { byId } = useAccounts();
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const sorted = [...(data ?? [])].sort((a, b) => +new Date(b.transactionDate) - +new Date(a.transactionDate));
    const map = new Map<string, Transaction[]>();
    for (const t of sorted) {
      const k = dayGroupKey(t.transactionDate);
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.values()];
  }, [data]);

  return (
    <Screen>
      <BackHeader
        title="Historial de transferencias"
        backHref="/cuentas"
        action={
          <button
            onClick={() => setOpen(true)}
            aria-label="Nueva transferencia"
            className="-mr-2 grid size-10 place-items-center rounded-full text-accent hover:bg-surface"
          >
            <Plus className="size-5" />
          </button>
        }
      />
      <div className="mt-4">
        {isLoading && !data ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="size-6" />}
            title="Sin transferencias"
            text="Las transferencias entre tus cuentas aparecerán aquí."
          />
        ) : (
          groups.map((g) => (
            <section key={dayGroupKey(g[0].transactionDate)} className="mt-3 first:mt-0">
              <p className="py-2 text-xs font-semibold tracking-wide text-cream/70">{dayLabel(g[0].transactionDate)}</p>
              <ul className="divide-y divide-line">
                {g.map((t) => {
                  const from = byId.get(t.accountId);
                  const to = t.toAccountId ? byId.get(t.toAccountId) : undefined;
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3.5">
                      <div className="flex shrink-0 items-center -space-x-2">
                        <IconBadge icon={from?.icon ?? "archive"} color={from?.color ?? NEUTRAL} size="sm" className="ring-2 ring-bg" />
                        <IconBadge icon={to?.icon ?? "archive"} color={to?.color ?? NEUTRAL} size="sm" className="ring-2 ring-bg" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate font-semibold">
                          {t.accountName ?? from?.name ?? "Cuenta"} <ArrowRight className="size-3.5 shrink-0 text-muted" />{" "}
                          {t.toAccountName ?? to?.name ?? "Cuenta"}
                        </p>
                        <p className="text-xs text-faint">{timeLabel(t.transactionDate)}</p>
                      </div>
                      <p className="num font-semibold">
                        {money(t.amount)} <span className="text-xs font-normal text-muted">{t.currency}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
      <TransferModal open={open} onClose={() => setOpen(false)} />
    </Screen>
  );
}
