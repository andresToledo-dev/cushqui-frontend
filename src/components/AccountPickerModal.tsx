"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { useAccounts } from "@/lib/hooks";
import { Button, IconBadge, Modal } from "./ui";

/** Modal con radio buttons para elegir "Total" o una cuenta concreta. */
export function AccountPickerModal({
  open,
  value,
  onClose,
  onSelect,
}: {
  open: boolean;
  value: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}) {
  return open ? <PickerBody value={value} onClose={onClose} onSelect={onSelect} /> : null;
}

function PickerBody({
  value,
  onClose,
  onSelect,
}: {
  value: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}) {
  const { accounts, total } = useAccounts();
  const [choice, setChoice] = useState<string>(value ?? "__total");
  const rows = [
    { id: "__total", name: "Total", icon: "archive", color: "#34d399", balance: total },
    ...accounts.map((a) => ({ id: a.id, name: a.name, icon: a.icon, color: a.color, balance: a.balance })),
  ];

  return (
    <Modal open onClose={onClose} title="Elegir cuenta" align="left">
      <div role="radiogroup" className="-mx-1 flex flex-col divide-y divide-line">
        {rows.map((r) => (
          <label key={r.id} className="flex cursor-pointer items-center gap-3 px-1 py-3.5">
            <input
              type="radio"
              name="account"
              value={r.id}
              checked={choice === r.id}
              onChange={() => setChoice(r.id)}
              className="peer sr-only"
            />
            <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-cream/60 peer-checked:border-cream peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              <span className={`size-2.5 rounded-full bg-cream transition ${choice === r.id ? "scale-100" : "scale-0"}`} />
            </span>
            <IconBadge icon={r.icon} color={r.color} size="sm" />
            <span className="flex-1 truncate font-medium">{r.name}</span>
            <span className="num text-[15px] font-semibold">
              {money(r.balance)} <span className="text-xs font-normal text-muted">EUR</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={() => {
            onSelect(choice === "__total" ? null : choice);
            onClose();
          }}
        >
          Seleccionar
        </Button>
      </div>
    </Modal>
  );
}
