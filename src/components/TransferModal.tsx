"use client";

import { ArrowDown } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { fromLocalInput, money, parseAmount, toLocalInput } from "@/lib/format";
import { refreshAll, useAccounts } from "@/lib/hooks";
import type { Movement } from "@/lib/types";
import { useToast } from "./Toast";
import { Button, Modal, SectionLabel, SelectField } from "./ui";

/** Crea una transferencia o, si recibe `transfer`, la edita. */
export function TransferModal({
  open,
  onClose,
  transfer,
}: {
  open: boolean;
  onClose: () => void;
  transfer?: Movement;
}) {
  if (!open) return null;
  return <TransferBody key={transfer?.id ?? "new"} onClose={onClose} transfer={transfer} />;
}

function TransferBody({ onClose, transfer }: { onClose: () => void; transfer?: Movement }) {
  const toast = useToast();
  const { accounts, byId } = useAccounts();
  const editing = !!transfer;
  const [fromChoice, setFrom] = useState<string | null>(transfer?.account.id ?? null);
  const [toChoice, setTo] = useState<string | null>(transfer?.toAccount?.id ?? null);
  // Valores por defecto cuando las cuentas terminan de cargar.
  const from = fromChoice ?? accounts[0]?.id ?? null;
  const to = toChoice ?? accounts.find((a) => a.id !== from)?.id ?? null;
  const [amount, setAmount] = useState(transfer ? money(transfer.amount) : "");
  const [date, setDate] = useState(toLocalInput(transfer?.movementDate ?? new Date().toISOString()));
  const [note, setNote] = useState(transfer?.note ?? "");
  const [busy, setBusy] = useState(false);

  const options = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    icon: a.icon,
    color: a.color,
    hint: `${money(a.balance)} EUR`,
  }));
  const value = parseAmount(amount);

  // Saldo disponible en el origen. Al editar, el backend revierte antes la transferencia original.
  let available = from ? (byId.get(from)?.balance ?? 0) : 0;
  if (transfer && from === transfer.account.id) available += transfer.amount;
  if (transfer && from === transfer.toAccount?.id) available -= transfer.amount;
  const insufficient = value > available + 1e-9;
  const valid = from && to && from !== to && value >= 0.01 && !insufficient;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const body = {
      fromAccountId: from!,
      toAccountId: to!,
      amount: Math.round(value * 100) / 100,
      currency: byId.get(from!)?.currency ?? "EUR",
      date: fromLocalInput(date),
      note: note.trim() || undefined,
    };
    try {
      if (transfer) await api.updateTransfer(transfer.id, { ...body, note: note.trim() });
      else await api.createTransfer(body);
      await refreshAll();
      toast(editing ? "Transferencia actualizada" : "Transferencia realizada");
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast(/insufficient balance/i.test(msg) ? "Saldo insuficiente en la cuenta de origen" : msg || "No se pudo guardar", "error");
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Editar transferencia" : "Nueva transferencia"}
      subtitle={editing ? "Los saldos de las cuentas se recalculan" : "Mueve dinero entre tus cuentas"}
    >
      {accounts.length < 2 ? (
        <p className="py-4 text-center text-sm text-muted">Necesitas al menos dos cuentas para hacer una transferencia.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <SectionLabel>Desde</SectionLabel>
            <SelectField title="Desde" value={from} options={options} onChange={setFrom} />
          </div>
          <div className="-my-1 flex justify-center text-muted">
            <ArrowDown className="size-4" />
          </div>
          <div>
            <SectionLabel>Hacia</SectionLabel>
            <SelectField title="Hacia" value={to} options={options.filter((o) => o.value !== from)} onChange={setTo} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <SectionLabel>Importe</SectionLabel>
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                className="num h-14 w-full rounded-2xl border border-line bg-surface px-4 text-lg font-semibold outline-none placeholder:text-faint focus:border-cream/30"
              />
            </div>
            <div>
              <SectionLabel>Fecha</SectionLabel>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-14 w-full rounded-2xl border border-line bg-surface px-3 text-base outline-none focus:border-cream/30"
              />
            </div>
          </div>
          <div>
            <SectionLabel>Nota</SectionLabel>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional"
              className="h-14 w-full rounded-2xl border border-line bg-surface px-4 outline-none placeholder:text-faint focus:border-cream/30"
            />
          </div>
          {from && to && from === to && <p className="text-xs text-danger">Elige dos cuentas distintas.</p>}
          {insufficient && value > 0 && (
            <p className="text-xs text-danger">Saldo insuficiente: la cuenta de origen tiene {money(available)} EUR disponibles.</p>
          )}
          <Button className="mt-3 w-full" disabled={!valid || busy} onClick={submit}>
            {busy ? "Guardando…" : editing ? "Guardar cambios" : "Transferir"}
          </Button>
        </div>
      )}
      <Button variant="ghost" className="mt-1 w-full" onClick={onClose}>
        Cancelar
      </Button>
    </Modal>
  );
}
