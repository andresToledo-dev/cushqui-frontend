"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { money, parseAmount } from "@/lib/format";
import { refreshAll, useAccounts, type AccountView } from "@/lib/hooks";
import { accountTypeForIcon, COLORS } from "@/lib/icons";
import { setAccountMeta } from "@/lib/meta";
import { Screen } from "./AppShell";
import { ColorPicker, IconPicker } from "./IconColorPicker";
import { useToast } from "./Toast";
import { BackHeader, Button, ConfirmModal, IconBadge, Input, SectionLabel, Spinner } from "./ui";

export function AccountForm({ id }: { id?: string }) {
  const { byId, isLoading } = useAccounts();
  if (id) {
    const account = byId.get(id);
    if (!account) {
      return (
        <Screen>
          {isLoading ? (
            <div className="grid place-items-center py-24">
              <Spinner />
            </div>
          ) : (
            <>
              <BackHeader title="Editar cuenta" backHref="/cuentas" />
              <p className="py-16 text-center text-muted">No se encontró la cuenta.</p>
            </>
          )}
        </Screen>
      );
    }
    return <Body key={account.id} account={account} />;
  }
  return <Body />;
}

function Body({ account }: { account?: AccountView }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(account?.name ?? "");
  const [icon, setIcon] = useState(account?.icon ?? "banknote");
  const [color, setColor] = useState(account?.color ?? COLORS[3]);
  const [initial, setInitial] = useState(account ? money(account.initialBalance) : "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const initialBalance = Math.round(parseAmount(initial) * 100) / 100;
      const saved = account
        ? // Se reenvía siempre el saldo inicial: la API lo pone a 0 si se omite.
          await api.updateAccount(account.id, { name: name.trim(), initialBalance, icon, color })
        : await api.createAccount({
            name: name.trim(),
            type: accountTypeForIcon(icon),
            currency: "EUR",
            initialBalance,
            icon,
            color,
          });
      setAccountMeta(saved.id, { icon, color });
      await refreshAll();
      toast(account ? "Cuenta actualizada" : "Cuenta creada");
      router.replace("/cuentas");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo guardar", "error");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!account) return;
    setBusy(true);
    try {
      await api.deleteAccount(account.id);
      await refreshAll();
      toast("Cuenta eliminada");
      router.replace("/cuentas");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo eliminar", "error");
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <Screen>
      <BackHeader title={account ? "Editar cuenta" : "Nueva cuenta"} backHref="/cuentas" />

      <div className="mt-4 flex items-center gap-4">
        <IconBadge icon={icon} color={color} size="xl" />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la cuenta"
          aria-label="Nombre de la cuenta"
          autoFocus={!account}
          className="text-[17px]"
        />
      </div>

      <div className="mt-7 flex flex-col gap-7">
        <IconPicker value={icon} color={color} onChange={setIcon} />
        <ColorPicker value={color} onChange={setColor} />
        <div>
          <SectionLabel>Saldo inicial</SectionLabel>
          <div className="relative">
            <Input
              inputMode="decimal"
              placeholder="0,00"
              value={initial}
              onChange={(e) => setInitial(e.target.value.replace(/[^\d.,-]/g, ""))}
              className="num pr-14"
            />
            <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted">EUR</span>
          </div>
          {account && (
            <p className="mt-2 px-1 text-xs text-faint">
              Balance actual: <span className="num text-cream/70">{money(account.balance)} EUR</span>
            </p>
          )}
        </div>
      </div>

      <Button className="mt-8 w-full" onClick={save} disabled={busy || !name.trim()}>
        {busy ? "Guardando…" : "Guardar cuenta"}
      </Button>
      {account && (
        <button
          onClick={() => setConfirm(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-danger transition hover:bg-danger/10"
        >
          <Trash2 className="size-4" /> Eliminar cuenta
        </button>
      )}
      <ConfirmModal
        open={confirm}
        title="¿Eliminar cuenta?"
        message={`Se eliminará "${account?.name}". Esta acción no se puede deshacer.`}
        busy={busy}
        onConfirm={remove}
        onClose={() => setConfirm(false)}
      />
    </Screen>
  );
}
