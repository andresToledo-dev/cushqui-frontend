"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { dayLabel, money, signedMoney, timeLabel } from "@/lib/format";
import { refreshAll, useAccounts } from "@/lib/hooks";
import type { Transaction } from "@/lib/types";
import { useToast } from "./Toast";
import { Button, ConfirmModal, Modal, SectionLabel, SelectField, Spinner } from "./ui";

const fieldClass =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base outline-none placeholder:text-faint focus:border-cream/30";

/**
 * Convierte un movimiento sin clasificar en una transferencia. Si el backend propone movimientos de la otra
 * cuenta (mismo importe, tipo contrario, fechas cercanas), se elige uno; si no, se elige la otra cuenta.
 */
export function ConvertTransferModal({
  open,
  tx,
  onClose,
  onConverted,
}: {
  open: boolean;
  tx: Transaction;
  onClose: () => void;
  onConverted: () => void;
}) {
  if (!open) return null;
  return <ConvertBody tx={tx} onClose={onClose} onConverted={onConverted} />;
}

function ConvertBody({ tx, onClose, onConverted }: { tx: Transaction; onClose: () => void; onConverted: () => void }) {
  const toast = useToast();
  const { accounts, byId } = useAccounts();
  const { data: candidates, error } = useSWR(["transfer-candidates", tx.id], () => api.transferCandidates(tx.id), {
    revalidateOnFocus: false,
  });
  const [candidateId, setCandidateId] = useState<string | null>(null);
  // Hay candidatos pero ninguno es la otra parte: se elige la cuenta como si no los hubiera.
  const [manual, setManual] = useState(false);
  const [otherAccountId, setOtherAccountId] = useState<string | null>(null);
  const [note, setNote] = useState(tx.merchant ?? "");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const expense = tx.type === "EXPENSE";
  const thisAccount = byId.get(tx.accountId)?.name ?? tx.accountName ?? "Cuenta";
  const pickCandidates = !manual && (candidates?.length ?? 0) > 0;
  const candidate = pickCandidates ? candidates?.find((c) => c.id === candidateId) : undefined;
  const otherName = pickCandidates
    ? candidate && (byId.get(candidate.accountId)?.name ?? candidate.accountName ?? "Cuenta")
    : otherAccountId
      ? byId.get(otherAccountId)?.name
      : undefined;
  // Un gasto sale de esta cuenta hacia la otra; un ingreso llega desde la otra.
  const from = expense ? thisAccount : otherName;
  const to = expense ? otherName : thisAccount;
  const ready = pickCandidates ? candidate !== undefined : otherAccountId !== null;

  const convert = async () => {
    setBusy(true);
    try {
      await api.convertToTransfer(
        tx.id,
        pickCandidates ? { otherTransactionId: candidateId! } : { otherAccountId: otherAccountId!, note: note.trim() || undefined },
      );
      await refreshAll();
      toast("Transferencia creada");
      onConverted();
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo convertir en transferencia", "error");
      setBusy(false);
      setConfirming(false);
    }
  };

  const accountOptions = accounts
    .filter((a) => a.id !== tx.accountId && a.currency === tx.currency)
    .map((a) => ({ value: a.id, label: a.name, icon: a.icon, color: a.color, hint: `${money(a.balance)} ${a.currency}` }));

  return (
    <>
      <Modal open onClose={onClose} title="Es transferencia" subtitle={`${money(tx.amount)} ${tx.currency} · ${dayLabel(tx.transactionDate)}`} align="left">
        {error ? (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error instanceof Error ? error.message : "No se pudieron cargar los movimientos relacionados"}
          </p>
        ) : !candidates ? (
          <div className="grid place-items-center py-10">
            <Spinner />
          </div>
        ) : pickCandidates ? (
          <>
            <SectionLabel>Elige la otra parte de la transferencia</SectionLabel>
            <div role="radiogroup" aria-label="Movimientos relacionados" className="-mx-1 flex flex-col divide-y divide-line">
              {candidates.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-3 px-1 py-3">
                  <input
                    type="radio"
                    name="candidate"
                    value={c.id}
                    checked={candidateId === c.id}
                    onChange={() => setCandidateId(c.id)}
                    className="peer sr-only"
                  />
                  <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-cream/60 peer-checked:border-cream peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                    <span className={`size-2.5 rounded-full bg-cream transition ${candidateId === c.id ? "scale-100" : "scale-0"}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.merchant || "Movimiento"}</span>
                    <span className="block truncate text-xs text-muted">
                      {byId.get(c.accountId)?.name ?? c.accountName ?? "Cuenta"} · {dayLabel(c.transactionDate)} {timeLabel(c.transactionDate)}
                    </span>
                  </span>
                  <span className={`num shrink-0 font-semibold ${c.type === "INCOME" ? "text-ok" : ""}`}>
                    {signedMoney(c.amount, c.type)} <span className="text-xs font-normal text-muted">{c.currency}</span>
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setManual(true)}
              className="mt-2 text-sm font-medium text-accent hover:underline"
            >
              Elegir otra cuenta
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <SectionLabel>{expense ? "Cuenta de destino" : "Cuenta de origen"}</SectionLabel>
              <SelectField
                title={expense ? "Cuenta de destino" : "Cuenta de origen"}
                value={otherAccountId}
                placeholder="Elige la cuenta"
                options={accountOptions}
                onChange={setOtherAccountId}
                compact
              />
              {accountOptions.length === 0 && (
                <p className="mt-1.5 px-1 text-xs text-faint">No hay otra cuenta activa en {tx.currency}.</p>
              )}
            </div>
            <div>
              <SectionLabel>Nota</SectionLabel>
              <input value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="Nota" aria-label="Nota" className={fieldClass} />
            </div>
            {manual && (
              <button type="button" onClick={() => setManual(false)} className="self-start text-sm font-medium text-accent hover:underline">
                Ver movimientos relacionados
              </button>
            )}
          </div>
        )}

        {candidates && (
          <div data-testid="transfer-preview" className="mt-4 flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-right font-medium">{from ?? "—"}</span>
            <ArrowRight className="size-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate font-medium">{to ?? "—"}</span>
            <span className="num shrink-0 font-semibold">
              {money(tx.amount)} <span className="text-xs font-normal text-muted">{tx.currency}</span>
            </span>
          </div>
        )}

        <Button className="mt-4 w-full" disabled={!ready || busy} onClick={() => setConfirming(true)}>
          Convertir en transferencia
        </Button>
      </Modal>

      <ConfirmModal
        open={confirming}
        title="¿Convertir en transferencia?"
        message={`Se ${candidate ? "eliminarán este movimiento y el seleccionado" : "eliminará este movimiento"} y se creará una transferencia de ${money(tx.amount)} ${tx.currency} de ${from} a ${to}. La transferencia no se puede eliminar.`}
        confirmLabel="Convertir"
        busy={busy}
        onConfirm={convert}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
