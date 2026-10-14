"use client";

import { Calendar, Layers, Pencil, Scissors, Tag, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { dateTimeLabel, signedMoney, splitInfo } from "@/lib/format";
import { refreshAll, useAccounts, useCategories, useTransaction } from "@/lib/hooks";
import { NEUTRAL } from "@/lib/icons";
import { Screen } from "./AppShell";
import { useToast } from "./Toast";
import { BackHeader, ConfirmModal, IconBadge, Spinner } from "./ui";

export function TransactionDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data: tx, error, isLoading } = useTransaction(id);
  const { byId: categoriesById } = useCategories();
  const { byId: accountsById } = useAccounts();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  if (isLoading || (!tx && !error)) {
    return (
      <Screen>
        <div className="grid place-items-center py-24">
          <Spinner />
        </div>
      </Screen>
    );
  }
  if (!tx) {
    return (
      <Screen>
        <BackHeader title="Detalle" backHref="/transacciones" />
        <p className="py-16 text-center text-muted">No se encontró el movimiento.</p>
      </Screen>
    );
  }

  const category = tx.categoryId ? categoriesById.get(tx.categoryId) : undefined;
  const account = accountsById.get(tx.accountId);
  const { text, part, total } = splitInfo(tx.description);

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteTransaction(tx.id);
      await refreshAll();
      toast("Movimiento eliminado");
      router.replace("/transacciones");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo eliminar", "error");
      setBusy(false);
    }
  };

  return (
    <Screen>
      <BackHeader
        title={<span className="block text-center">Detalle</span>}
        action={
          <Link
            href={`/transacciones/${tx.id}/editar`}
            aria-label="Editar"
            className="-mr-2 grid size-10 place-items-center rounded-full text-accent hover:bg-surface"
          >
            <Pencil className="size-5" />
          </Link>
        }
      />

      <div className="mt-6 flex flex-col items-center text-center">
        <IconBadge
          icon={category?.icon ?? "card"}
          color={category?.color ?? NEUTRAL}
          size="xl"
        />
        <p className={`num mt-4 text-5xl font-semibold ${tx.type === "INCOME" ? "text-ok" : ""}`}>
          {signedMoney(tx.amount, tx.type)}
          <span className="ml-2 text-xl font-medium text-muted">EUR</span>
        </p>
        <p className="mt-2 text-sm text-cream/70">{tx.merchant || text || category?.name || "Movimiento"}</p>
        {total && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warn/10 px-3 py-1 text-xs font-semibold text-warn">
            <Scissors className="size-3.5" /> Fraccionado · parte {part} de {total}
          </span>
        )}
        {tx.status === "UNCLASSIFIED" && (
          <span className="mt-3 rounded-full bg-fab/10 px-3 py-1 text-xs font-semibold text-fab">Pendiente de clasificar</span>
        )}
      </div>

      <dl className="mt-8 divide-y divide-line border-y border-line">
        <Row icon={<Wallet />} label="Cuenta" value={account?.name ?? tx.accountName ?? "—"} />
        <Row icon={<Tag />} label="Categoría" value={tx.categoryName ?? category?.name ?? "Sin categoría"} />
        <Row icon={<Layers />} label="Subcategoría" value={tx.subcategoryName ?? "—"} />
        <Row icon={<Calendar />} label="Fecha" value={dateTimeLabel(tx.transactionDate)} />
      </dl>

      <div className="mt-6">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Descripción</p>
        <p className="mt-2 whitespace-pre-wrap text-[15px]">{text || <span className="text-faint">Sin descripción</span>}</p>
      </div>

      <button
        onClick={() => setConfirm(true)}
        className="mt-10 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-danger transition hover:bg-danger/10"
      >
        <Trash2 className="size-4" /> Eliminar movimiento
      </button>

      <ConfirmModal
        open={confirm}
        title="¿Eliminar movimiento?"
        message="Esta acción no se puede deshacer."
        busy={busy}
        onConfirm={remove}
        onClose={() => setConfirm(false)}
      />
    </Screen>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="text-faint [&>svg]:size-[18px]">{icon}</span>
      <dt className="flex-1 text-cream/60">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
