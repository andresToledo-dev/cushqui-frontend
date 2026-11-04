"use client";

import { Bell, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { refreshAll, useAccounts, useIntegration } from "@/lib/hooks";
import { joinPhrases, MAX_PHRASES, splitPhrases } from "@/lib/notificationWords";
import type { Integration, IntegrationType } from "@/lib/types";
import { Screen } from "./AppShell";
import { SecretStep } from "./SecretStep";
import { useToast } from "./Toast";
import { BackHeader, Button, Input, SectionLabel, SelectField, Spinner, Tabs } from "./ui";
import { WordsEditor } from "./WordsEditor";

export const TYPE_LABEL: Record<IntegrationType, string> = { NOTIFICATION: "Notificación", MANUAL: "Manual" };
const NOTIFICATION_EXAMPLE = "Has enviado 1€ a John Doe. Llegara en segundo";
const BACK = "/integraciones";

/** Crear (sin id) o editar una integración. Al editar solo cambian el nombre y las frases. */
export function IntegrationForm({ id }: { id?: string }) {
  return id ? <EditLoader id={id} /> : <FormBody />;
}

function EditLoader({ id }: { id: string }) {
  const { data, error, isLoading } = useIntegration(id);
  if (isLoading || (!data && !error)) {
    return (
      <Screen>
        <div className="grid place-items-center py-24">
          <Spinner />
        </div>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <BackHeader title="Editar integración" backHref={BACK} />
        <p className="py-16 text-center text-muted">No se encontró la integración.</p>
      </Screen>
    );
  }
  return <FormBody integration={data} />;
}

function FormBody({ integration }: { integration?: Integration }) {
  const router = useRouter();
  const toast = useToast();
  const { accounts, byId } = useAccounts();
  const editing = Boolean(integration);
  const [type, setType] = useState<IntegrationType>(integration?.type ?? "NOTIFICATION");
  const [accountId, setAccountId] = useState<string | null>(integration?.accountId ?? null);
  const [customName, setCustomName] = useState<string | null>(integration?.name ?? null);
  const [income, setIncome] = useState(() => splitPhrases(integration?.incomeWords));
  const [expense, setExpense] = useState(() => splitPhrases(integration?.expenseWords));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Integration | null>(null);

  const notification = type === "NOTIFICATION";
  const accountName = accountId ? byId.get(accountId)?.name : undefined;
  // El nombre sigue al tipo y la cuenta hasta que el usuario lo edita.
  const name = customName ?? (accountName ? `${TYPE_LABEL[type]} · ${accountName}` : TYPE_LABEL[type]);

  const submit = async () => {
    setTried(true);
    if (!editing && notification && !accountId) {
      setError("Una integración de notificación necesita una cuenta: los movimientos se registran en ella.");
      return;
    }
    if (!name.trim()) {
      setError("Pon un nombre a la integración.");
      return;
    }
    if (notification && (income.length === 0 || expense.length === 0)) {
      setError("Añade al menos una frase de ingreso y una de gasto.");
      return;
    }
    // Las frases viajan juntas, separadas por comas. MANUAL no lleva frases.
    const words = notification ? { incomeWords: joinPhrases(income), expenseWords: joinPhrases(expense) } : {};
    setBusy(true);
    setError(null);
    try {
      if (integration) {
        await api.updateIntegration(integration.id, { name: name.trim(), ...words });
        await refreshAll();
        toast("Integración actualizada");
        router.push(BACK);
        return;
      }
      const res = await api.createIntegration({ name: name.trim(), type, accountId: accountId ?? undefined, ...words });
      setCreated(res);
      refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la integración");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Screen>
        <BackHeader title="Integración creada" backHref={BACK} />
        <p className="mt-4 mb-4 text-center text-sm text-muted">{created.name}</p>
        <SecretStep
          value={created.plainToken ?? ""}
          hint="Cópialo en tu integración y guárdalo: no se volverá a mostrar."
          testId="integration-token"
          onDone={() => router.push(BACK)}
          onCopied={() => toast("Token copiado")}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title={editing ? "Editar integración" : "Nueva integración"} backHref={BACK} />

      <div className="mt-6 flex flex-col gap-5">
        {editing ? (
          // Al editar, el tipo y la cuenta no se pueden cambiar.
          <div data-testid="integration-readonly" className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-xl ${notification ? "bg-accent/15 text-accent" : "bg-fab/15 text-fab"}`}
            >
              {notification ? <Bell className="size-[18px]" /> : <KeyRound className="size-[18px]" />}
            </span>
            <div className="min-w-0">
              <p className="font-medium">{TYPE_LABEL[type]}</p>
              <p className="truncate text-xs text-muted">
                {accountName ?? (accountId ? "Cuenta eliminada" : "Sin cuenta")} · El tipo y la cuenta no se pueden cambiar
              </p>
            </div>
          </div>
        ) : (
          <>
            <div>
              <SectionLabel>Tipo</SectionLabel>
              <Tabs
                value={type}
                onChange={(t) => {
                  setType(t);
                  setError(null);
                }}
                options={[
                  { value: "NOTIFICATION", label: <><Bell className="size-4" /> Notificación</> },
                  { value: "MANUAL", label: <><KeyRound className="size-4" /> Manual</> },
                ]}
              />
            </div>

            <div>
              <SectionLabel>
                Cuenta {type === "MANUAL" && <span className="normal-case tracking-normal text-faint">(opcional)</span>}
              </SectionLabel>
              <SelectField
                title="Cuenta"
                compact
                value={accountId}
                placeholder={type === "MANUAL" ? "Sin cuenta" : "Elige la cuenta de las notificaciones"}
                allowClear={type === "MANUAL"}
                clearLabel="Sin cuenta"
                options={accounts.map((a) => ({ value: a.id, label: a.name, icon: a.icon, color: a.color }))}
                onChange={(v) => {
                  setAccountId(v);
                  setError(null);
                }}
              />
            </div>
          </>
        )}

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

        {notification ? (
          <section className="flex flex-col gap-4 border-t border-line pt-5">
            <div>
              <h2 className="font-display text-lg font-semibold">Mensaje notificación</h2>
              <p className="mt-1 text-sm text-muted">
                Si la notificación contiene una frase de ingreso se registra como ingreso; si contiene una de gasto, como
                gasto. Hasta {MAX_PHRASES} frases por bloque.
              </p>
            </div>
            <WordsEditor
              label="Gasto"
              tone="expense"
              phrases={expense}
              others={income}
              onChange={(p) => {
                setExpense(p);
                setError(null);
              }}
              minOne={editing}
              invalid={tried && expense.length === 0}
            />
            <WordsEditor
              label="Ingreso"
              tone="income"
              phrases={income}
              others={expense}
              onChange={(p) => {
                setIncome(p);
                setError(null);
              }}
              minOne={editing}
              invalid={tried && income.length === 0}
            />
            <div className="rounded-xl bg-surface px-3 py-2.5">
              <p className="text-xs text-muted">Ejemplo de la notificación que se debe enviar:</p>
              <p className="mt-1.5 rounded-lg bg-bg px-2.5 py-2 font-mono text-[13px] leading-snug text-cream/90">
                {NOTIFICATION_EXAMPLE}
              </p>
            </div>
          </section>
        ) : (
          !editing && (
            <p className="rounded-xl bg-surface px-3 py-2.5 text-sm text-cream/85">
              Debe enviar manualmente importe, cuenta final, tipo de movimiento (gasto o ingreso)
            </p>
          )
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button onClick={submit} disabled={busy} className="w-full">
          {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear integración"}
        </Button>
      </div>
    </Screen>
  );
}
