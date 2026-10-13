"use client";

import { ArrowLeftRight, ChevronRight, History, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/format";
import { useAccounts } from "@/lib/hooks";
import { Screen } from "./AppShell";
import { TransferModal } from "./TransferModal";
import { EmptyState, Fab, IconBadge, Spinner } from "./ui";

export function AccountsScreen() {
  const { accounts, total, isLoading } = useAccounts();
  const [transfer, setTransfer] = useState(false);

  return (
    <>
      <Screen>
        <h1 className="-mt-7 text-center text-[15px] text-cream/70">Cuentas</h1>
        <div className="mt-8 text-center">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">Balance total</p>
          <p className="num mt-1 text-[44px] leading-tight font-semibold">
            {isLoading ? "—" : money(total)} <span className="text-lg font-medium text-muted">EUR</span>
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/cuentas/transferencias"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface text-sm font-semibold transition hover:bg-surface-2"
          >
            <History className="size-4" /> Historial
          </Link>
          <button
            onClick={() => setTransfer(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface text-sm font-semibold transition hover:bg-surface-2"
          >
            <ArrowLeftRight className="size-4" /> Nueva transferencia
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {isLoading && accounts.length === 0 ? (
            <div className="grid place-items-center py-12">
              <Spinner />
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-6" />}
              title="Aún no tienes cuentas"
              text="Crea tu primera cuenta para empezar a registrar movimientos."
            />
          ) : (
            accounts.map((a) => (
              <Link
                key={a.id}
                href={`/cuentas/${a.id}`}
                className="flex items-center gap-4 rounded-2xl bg-surface px-4 py-3.5 transition hover:bg-surface-2"
              >
                <IconBadge icon={a.icon} color={a.color} />
                <span className="flex-1 truncate text-[17px] font-medium">{a.name}</span>
                <span className="num font-semibold">
                  {money(a.balance)} <span className="text-xs font-medium text-muted">{a.currency}</span>
                </span>
                <ChevronRight className="size-4 text-faint" />
              </Link>
            ))
          )}
        </div>

        <Link
          href="/cuentas/nueva"
          className="mt-6 flex h-12 items-center justify-center gap-2 rounded-2xl bg-cream font-semibold text-ink transition hover:bg-white active:scale-[0.98]"
        >
          <Plus className="size-4" /> Añadir cuenta
        </Link>
      </Screen>
      <Fab />
      <TransferModal open={transfer} onClose={() => setTransfer(false)} />
    </>
  );
}
