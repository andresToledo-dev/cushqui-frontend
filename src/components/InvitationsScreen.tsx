"use client";

import { Ban, Plus, Ticket } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { dateTimeLabel } from "@/lib/format";
import { refreshAll, useInvitations, useMe } from "@/lib/hooks";
import type { Invitation, InvitationStatus } from "@/lib/types";
import { FixedScreen, SidebarToggle } from "./AppShell";
import { SecretStep } from "./SecretStep";
import { useToast } from "./Toast";
import { Button, ConfirmModal, EmptyState, Input, Modal, SectionLabel, Spinner, Tabs } from "./ui";

const STATUS: Record<InvitationStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-accent/15 text-accent" },
  USED: { label: "Usada", className: "bg-ok/15 text-ok" },
  EXPIRED: { label: "Caducada", className: "bg-surface-2 text-muted" },
  REVOKED: { label: "Revocada", className: "bg-danger/10 text-danger" },
};

const VALIDITY = [1, 7, 30] as const;

export function InvitationsScreen() {
  const { data: me, isLoading: loadingMe } = useMe();
  const isAdmin = me?.role === "ADMIN";
  const { data, isLoading } = useInvitations(isAdmin);
  const invitations = data ?? [];
  const used = invitations.filter((i) => i.status === "USED").length;
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);

  const header = (
    <div className="relative flex h-11 items-center justify-center">
      <SidebarToggle className="absolute left-0" />
      <h1 className="text-[15px] text-cream/70">Invitaciones</h1>
    </div>
  );

  if (!isAdmin) {
    return (
      <FixedScreen toggle={false} header={header}>
        {loadingMe ? (
          <div className="grid place-items-center py-12">
            <Spinner />
          </div>
        ) : (
          <EmptyState
            icon={<Ticket className="size-6" />}
            title="Solo para administradores"
            text="Las invitaciones solo las puede gestionar un usuario administrador."
          />
        )}
      </FixedScreen>
    );
  }

  return (
    <>
      <FixedScreen
        toggle={false}
        header={
          <>
            {header}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Creadas" value={data ? invitations.length : "—"} />
              <Stat label="Usadas" value={data ? used : "—"} />
            </div>
            <div className="border-b border-line pt-3 pb-4">
              <button
                onClick={() => setCreating(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cream font-semibold text-ink transition hover:bg-white active:scale-[0.98]"
              >
                <Plus className="size-4" /> Nueva invitación
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
          ) : invitations.length === 0 ? (
            <EmptyState
              icon={<Ticket className="size-6" />}
              title="Aún no has creado invitaciones"
              text="Crea un código y compártelo con quien quieras que se registre."
            />
          ) : (
            invitations.map((i) => <InvitationRow key={i.id} invitation={i} onRevoke={() => setRevoking(i)} />)
          )}
        </div>
      </FixedScreen>

      {creating && <CreateInvitationModal onClose={() => setCreating(false)} />}
      <RevokeInvitation invitation={revoking} onClose={() => setRevoking(null)} />
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

function InvitationRow({ invitation: i, onRevoke }: { invitation: Invitation; onRevoke: () => void }) {
  const status = STATUS[i.status];
  const detail =
    i.status === "USED"
      ? `Usada por ${i.usedByEmail ?? "un usuario eliminado"}${i.usedAt ? ` · ${dateTimeLabel(i.usedAt)}` : ""}`
      : i.status === "REVOKED"
        ? `Revocada${i.revokedAt ? ` · ${dateTimeLabel(i.revokedAt)}` : ""}`
        : `${i.status === "EXPIRED" ? "Caducó" : "Caduca"} ${dateTimeLabel(i.expiresAt)}`;

  return (
    <div data-testid="invitation-row" className="flex items-center gap-2.5 rounded-2xl bg-surface px-3 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fab/15 text-fab">
        <Ticket className="size-[18px]" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{i.email ?? "Cualquier email"}</span>
          {i.role === "ADMIN" && (
            <span className="shrink-0 rounded-md bg-warn/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-warn uppercase">
              Admin
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-muted">{detail}</p>
      </div>
      <span
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${status.className}`}
      >
        {status.label}
      </span>
      {/* Solo se puede revocar una invitación que nadie ha usado todavía. */}
      {i.status === "PENDING" && (
        <button
          onClick={onRevoke}
          aria-label={`Revocar invitación de ${i.email ?? "cualquier email"}`}
          title="Revocar"
          className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
        >
          <Ban className="size-4" />
        </button>
      )}
    </div>
  );
}

function CreateInvitationModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState<(typeof VALIDITY)[number]>(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Invitation | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.createInvitation({ email: email.trim() || undefined, expiresInDays: days });
      setCreated(res);
      refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la invitación");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Modal open onClose={onClose} title="Invitación creada" subtitle={created.email ?? "Válida para cualquier email"}>
        <SecretStep
          value={created.code ?? ""}
          hint="Compártelo con la persona invitada: no se volverá a mostrar."
          testId="invitation-code"
          onDone={onClose}
          onCopied={() => toast("Código copiado")}
        />
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Nueva invitación" align="left">
      {/* Sin <form>: los botones de Tabs no llevan type="button" y lo enviarían al elegir la validez. */}
      <div className="flex flex-col gap-4">
        <div>
          <SectionLabel>
            Email <span className="normal-case tracking-normal text-faint">(opcional)</span>
          </SectionLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !busy && submit()}
            placeholder="Cualquier email"
            aria-label="Email de la persona invitada"
            className="h-12!"
          />
          <p className="mt-1.5 px-1 text-xs text-faint">Si lo indicas, solo ese email podrá registrarse con el código.</p>
        </div>

        <div>
          <SectionLabel>Validez</SectionLabel>
          <Tabs
            value={String(days)}
            onChange={(v) => setDays(Number(v) as (typeof VALIDITY)[number])}
            options={VALIDITY.map((d) => ({ value: String(d), label: d === 1 ? "1 día" : `${d} días` }))}
          />
        </div>

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

function RevokeInvitation({ invitation, onClose }: { invitation: Invitation | null; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const revoke = async () => {
    if (!invitation) return;
    setBusy(true);
    try {
      await api.revokeInvitation(invitation.id);
      toast("Invitación revocada");
      refreshAll();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo revocar", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConfirmModal
      open={invitation !== null}
      title="Revocar invitación"
      message={`¿Seguro que quieres revocar la invitación${invitation?.email ? ` de «${invitation.email}»` : ""}? Su código dejará de servir para registrarse.`}
      confirmLabel="Revocar"
      busy={busy}
      onConfirm={revoke}
      onClose={onClose}
    />
  );
}
