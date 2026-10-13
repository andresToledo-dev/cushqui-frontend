"use client";

import { ArrowDown } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { fromLocalInput, money, parseAmount, toLocalInput } from "@/lib/format";
import { refreshAll, useAccounts } from "@/lib/hooks";
import { useToast } from "./Toast";
import { Button, Modal, SectionLabel, SelectField } from "./ui";

export function TransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <TransferBody onClose={onClose} />;
}

function TransferBody({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { accounts, byId } = useAccounts();
  const [fromChoice, setFrom] = useState<string | null>(null);
  const [toChoice, setTo] = useState<string | null>(null);
  // Valores por defecto cuando las cuentas terminan de cargar.
  const from = fromChoice ?? accounts[0]?.id ?? null;
  const to = toChoice ?? accounts.find((a) => a.id !== from)?.id ?? null;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toLocalInput(new Date().toISOString()));
  const [busy, setBusy] = useState(false);

  const options = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    icon: a.icon,
    color: a.color,
    hint: `${money(a.balance)} EUR`,
  }));
  const value = parseAmount(amount);
  const valid = from && to && from !== to && value >= 0.01;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await api.createTransfer({
        fromAccountId: from!,
        toAccountId: to!,
        amount: Math.round(value * 100) / 100,
        currency: byId.get(from!)?.currency ?? "EUR",
        date: fromLocalInput(date),
      });
      await refreshAll();
      toast("Transferencia realizada");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo transferir", "error");
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Nueva transferencia" subtitle="Mueve dinero entre tus cuentas">
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
                className="h-14 w-full rounded-2xl border border-line bg-surface px-3 text-sm outline-none focus:border-cream/30"
              />
            </div>
          </div>
          {from && to && from === to && <p className="text-xs text-danger">Elige dos cuentas distintas.</p>}
          <Button className="mt-3 w-full" disabled={!valid || busy} onClick={submit}>
            {busy ? "Transfiriendo…" : "Transferir"}
          </Button>
        </div>
      )}
      <Button variant="ghost" className="mt-1 w-full" onClick={onClose}>
        Cancelar
      </Button>
    </Modal>
  );
}
