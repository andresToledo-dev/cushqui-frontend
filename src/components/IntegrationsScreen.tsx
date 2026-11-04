"use client";

import { Bell, Clock, KeyRound, Pencil, Plug, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { dateTimeLabel } from "@/lib/format";
import { refreshAll, useAccounts, useIntegrations } from "@/lib/hooks";
import type { Integration } from "@/lib/types";
import { FixedScreen, SidebarToggle } from "./AppShell";
import { TYPE_LABEL } from "./IntegrationForm";
import { useToast } from "./Toast";
import { ConfirmModal, EmptyState, IconBadge, Spinner } from "./ui";

export function IntegrationsScreen() {
  const { data, isLoading } = useIntegrations();
  const integrations = data ?? [];
  const totalImports = integrations.reduce((n, i) => n + (i.importEventsCount ?? 0), 0);
  const [removing, setRemoving] = useState<Integration | null>(null);

  return (
    <>
      <FixedScreen
        toggle={false}
        header={
          <>
            <div className="relative flex h-11 items-center justify-center">
              <SidebarToggle className="absolute left-0" />
              <h1 className="text-[15px] text-cream/70">Integraciones</h1>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Integraciones" value={data ? integrations.length : "—"} />
              <Stat label="Imports recibidos" value={data ? totalImports : "—"} />
            </div>
            <div className="border-b border-line pt-3 pb-4">
              <Link
                href="/integraciones/nueva"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cream font-semibold text-ink transition hover:bg-white active:scale-[0.98]"
              >
                <Plus className="size-4" /> Nueva integración
              </Link>
            </div>
          </>
        }
      >
        <div className="mt-4 flex flex-col gap-2">
          {isLoading && !data ? (
            <div className="grid place-items-center py-12">
              <Spinner />
            </div>
          ) : integrations.length === 0 ? (
            <EmptyState
              icon={<Plug className="size-6" />}
              title="Aún no tienes integraciones"
              text="Crea una para que las notificaciones de tu banco o un envío manual registren tus movimientos."
            />
          ) : (
            integrations.map((i) => <IntegrationRow key={i.id} integration={i} onDelete={() => setRemoving(i)} />)
          )}
        </div>
      </FixedScreen>

      <DeleteIntegration integration={removing} onClose={() => setRemoving(null)} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{label}</p>
      <p className="num mt-0.5 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function IntegrationRow({ integration: i, onDelete }: { integration: Integration; onDelete: () => void }) {
  const { byId } = useAccounts();
  const account = i.accountId ? byId.get(i.accountId) : undefined;
  const notification = i.type === "NOTIFICATION";
  const Icon = notification ? Bell : KeyRound;
  const count = i.importEventsCount ?? 0;

  return (
    <div
      data-testid="integration-row"
      className={`flex items-center gap-2.5 rounded-2xl bg-surface py-3 pr-1.5 pl-3 ${i.isActive ? "" : "opacity-50"}`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${notification ? "bg-accent/15 text-accent" : "bg-fab/15 text-fab"}`}
      >
        <Icon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{i.name}</span>
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
              notification ? "bg-accent/15 text-accent" : "bg-fab/15 text-fab"
            }`}
          >
            {TYPE_LABEL[i.type]}
          </span>
          {!i.isActive && <span className="shrink-0 text-[10px] text-muted uppercase">Inactiva</span>}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted">
          {/* La cuenta tiene prioridad: si falta espacio se recorta antes la fecha de uso. */}
          {account ? (
            <span className="flex max-w-[60%] shrink-0 items-center gap-1.5">
              <IconBadge icon={account.icon} color={account.color} size="xs" className="size-4! rounded-[5px]! [&_svg]:size-2.5!" />
              <span className="truncate text-cream/80">{account.name}</span>
            </span>
          ) : (
            <span className="shrink-0">{i.accountId ? "Cuenta eliminada" : "Sin cuenta"}</span>
          )}
          <span aria-hidden>·</span>
          {i.lastUsedAt ? (
            <span className="flex min-w-0 items-center gap-1" title="Último uso">
              <Clock className="size-3 shrink-0" aria-label="Usada" />
              <span className="truncate">{dateTimeLabel(i.lastUsedAt)}</span>
            </span>
          ) : (
            <span className="min-w-0 truncate">Sin usar</span>
          )}
        </div>
      </div>
      <div className="min-w-10 shrink-0 text-right">
        <p className="num text-lg leading-none font-semibold">{count}</p>
        <p className="mt-1 text-[10px] text-muted">{count === 1 ? "import" : "imports"}</p>
      </div>
      <Link
        href={`/integraciones/${i.id}`}
        aria-label={`Editar ${i.name}`}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-cream"
      >
        <Pencil className="size-4" />
      </Link>
      <button
        onClick={onDelete}
        aria-label={`Eliminar ${i.name}`}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function DeleteIntegration({ integration, onClose }: { integration: Integration | null; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!integration) return;
    setBusy(true);
    try {
      await api.deleteIntegration(integration.id);
      toast("Integración eliminada");
      refreshAll();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo eliminar", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConfirmModal
      open={integration !== null}
      title="Eliminar integración"
      message={`¿Seguro que quieres eliminar la integración «${integration?.name ?? ""}»? Quien use su token dejará de poder enviar movimientos.`}
      busy={busy}
      onConfirm={remove}
      onClose={onClose}
    />
  );
}
