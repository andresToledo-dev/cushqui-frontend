"use client";

import { Check, Clock, Copy, KeyRound, Plug, Plus, Smartphone, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { dateTimeLabel } from "@/lib/format";
import { refreshAll, useAccounts, useIntegrations } from "@/lib/hooks";
import type { Integration, IntegrationType } from "@/lib/types";
import { FixedScreen, SidebarToggle } from "./AppShell";
import { useToast } from "./Toast";
import { Button, ConfirmModal, EmptyState, IconBadge, Input, Modal, SectionLabel, SelectField, Spinner, Tabs } from "./ui";

const TYPE_LABEL: Record<IntegrationType, string> = { SHORTCUT: "Atajo", MANUAL: "Manual" };
const SHORTCUT_EXAMPLE = "Has enviado 1€ a John Doe. Llegara en segundo";

export function IntegrationsScreen() {
  const { data, isLoading } = useIntegrations();
  const integrations = data ?? [];
  const totalImports = integrations.reduce((n, i) => n + (i.importEventsCount ?? 0), 0);
  const [creating, setCreating] = useState(false);
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
              <button
                onClick={() => setCreating(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cream font-semibold text-ink transition hover:bg-white active:scale-[0.98]"
              >
                <Plus className="size-4" /> Nueva integración
              </button>
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
              text="Crea una para que un atajo de iOS o un envío manual registre tus movimientos."
            />
          ) : (
            integrations.map((i) => <IntegrationRow key={i.id} integration={i} onDelete={() => setRemoving(i)} />)
          )}
        </div>
      </FixedScreen>

      <CreateIntegrationModal open={creating} onClose={() => setCreating(false)} />
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
  const shortcut = i.type === "SHORTCUT";
  const Icon = shortcut ? Smartphone : KeyRound;
  const count = i.importEventsCount ?? 0;

  return (
    <div
      data-testid="integration-row"
      className={`flex items-center gap-2.5 rounded-2xl bg-surface py-3 pr-1.5 pl-3 ${i.isActive ? "" : "opacity-50"}`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${shortcut ? "bg-accent/15 text-accent" : "bg-fab/15 text-fab"}`}
      >
        <Icon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{i.name}</span>
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
              shortcut ? "bg-accent/15 text-accent" : "bg-fab/15 text-fab"
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

function CreateIntegrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Se monta de nuevo en cada apertura: así el formulario y el token empiezan vacíos.
  return open ? <CreateBody onClose={onClose} /> : null;
}

function CreateBody({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { accounts, byId } = useAccounts();
  const [type, setType] = useState<IntegrationType>("SHORTCUT");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Integration | null>(null);

  const accountName = accountId ? byId.get(accountId)?.name : undefined;
  // El nombre sigue al tipo y la cuenta hasta que el usuario lo edita.
  const name = customName ?? (accountName ? `${TYPE_LABEL[type]} · ${accountName}` : TYPE_LABEL[type]);
  const needsAccount = type === "SHORTCUT" && !accountId;

  const submit = async () => {
    if (needsAccount) {
      setError("Un atajo necesita una cuenta: los movimientos se registran en ella.");
      return;
    }
    if (!name.trim()) {
      setError("Pon un nombre a la integración.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.createIntegration({ name: name.trim(), type, accountId: accountId ?? undefined });
      setCreated(res);
      refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la integración");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Modal open onClose={onClose} title="Integración creada" subtitle={created.name}>
        <TokenStep token={created.plainToken ?? ""} onDone={onClose} onCopied={() => toast("Token copiado")} />
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Nueva integración" align="left">
      <div className="flex flex-col gap-4">
        <div>
          <SectionLabel>Tipo</SectionLabel>
          <Tabs
            value={type}
            onChange={(t) => {
              setType(t);
              setError(null);
            }}
            options={[
              { value: "SHORTCUT", label: <><Smartphone className="size-4" /> Atajo</> },
              { value: "MANUAL", label: <><KeyRound className="size-4" /> Manual</> },
            ]}
          />
        </div>

        <div>
          <SectionLabel>Cuenta {type === "MANUAL" && <span className="normal-case tracking-normal text-faint">(opcional)</span>}</SectionLabel>
          <SelectField
            title="Cuenta"
            compact
            value={accountId}
            placeholder={type === "MANUAL" ? "Sin cuenta" : "Elige la cuenta del atajo"}
            allowClear={type === "MANUAL"}
            clearLabel="Sin cuenta"
            options={accounts.map((a) => ({ value: a.id, label: a.name, icon: a.icon, color: a.color }))}
            onChange={(v) => {
              setAccountId(v);
              setError(null);
            }}
          />
        </div>

        <div>
          <SectionLabel>Nombre</SectionLabel>
          <Input
            value={name}
            maxLength={100}
            onChange={(e) => setCustomName(e.target.value)}
            aria-label="Nombre de la integración"
            className="h-12!"
          />
        </div>

        {type === "MANUAL" ? (
          <p className="rounded-xl bg-surface px-3 py-2.5 text-sm text-cream/85">
            Debe enviar manualmente importe, cuenta final, tipo de movimiento (gasto o ingreso)
          </p>
        ) : (
          <div className="rounded-xl bg-surface px-3 py-2.5">
            <p className="text-xs text-muted">Ejemplo de la notificación que debe enviar el atajo:</p>
            <p className="mt-1.5 rounded-lg bg-bg px-2.5 py-2 font-mono text-[13px] leading-snug text-cream/90">
              {SHORTCUT_EXAMPLE}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Creando…" : "Crear"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Copia al portapapeles. En HTTP sin TLS (la app abierta por IP en el móvil) no existe navigator.clipboard. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  el.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {}
  el.remove();
  return ok;
}

function TokenStep({ token, onDone, onCopied }: { token: string; onDone: () => void; onCopied: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(token)) {
      setCopied(true);
      onCopied();
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="flex gap-2.5 rounded-xl bg-warn/10 px-3 py-2.5 text-sm text-warn">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <span>Cópialo en tu integración y guárdalo: no se volverá a mostrar.</span>
      </p>
      <p
        data-testid="integration-token"
        className="rounded-xl border border-line bg-bg px-3 py-3 font-mono text-[13px] leading-relaxed break-all text-cream select-all"
      >
        {token}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button onClick={onDone}>Hecho</Button>
      </div>
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
