"use client";

import { ArrowLeft, ChartNoAxesColumn, ChartPie, ChevronDown, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type TouchEvent, type UIEvent, type WheelEvent } from "react";
import { money, monthLabel, monthRange } from "@/lib/format";
import { useAccounts, useCategories, useTransactions, type CategoryView } from "@/lib/hooks";
import { NEUTRAL } from "@/lib/icons";
import type { Transaction } from "@/lib/types";
import { AccountPickerModal } from "./AccountPickerModal";
import { SidebarToggle } from "./AppShell";
import { DonutChart, StackedBar, type Slice } from "./charts";
import { EmptyState, Fab, IconBadge, Spinner, Tabs } from "./ui";

type Kind = "EXPENSE" | "INCOME";
const NONE = "__none";
const ACCOUNT_KEY = "cushqui.home.account";

interface Row extends Slice {
  icon: string;
  pct: number;
  gradient?: boolean;
  drillable: boolean;
}

/** Tonos de un mismo color para las subcategorías del gráfico. */
function shade(color: string, i: number): string {
  if (i === 0) return color;
  const mix = i % 2 === 1 ? "#ffffff" : "#000000";
  const amount = Math.min(15 + Math.floor((i + 1) / 2) * 14, 70);
  return `color-mix(in srgb, ${color} ${100 - amount}%, ${mix})`;
}

export function HomeScreen() {
  const router = useRouter();
  const now = new Date();
  const [period, setPeriod] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [kind, setKind] = useState<Kind>("EXPENSE");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [drill, setDrill] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  const { accounts, total, byId: accountsById, isLoading: loadingAccounts } = useAccounts();
  const { byId: categoriesById } = useCategories();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCOUNT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferencia guardada en el navegador
      if (saved) setAccountId(saved);
    } catch {}
  }, []);

  // Si la cuenta guardada ya no existe se vuelve a "Total".
  const account = accountId ? accountsById.get(accountId) : undefined;
  const effectiveAccountId = account ? accountId : null;

  const selectAccount = (id: string | null) => {
    setAccountId(id);
    setDrill(null);
    try {
      if (id) localStorage.setItem(ACCOUNT_KEY, id);
      else localStorage.removeItem(ACCOUNT_KEY);
    } catch {}
  };

  const range = monthRange(period.y, period.m);
  const { data: txs, isLoading } = useTransactions({ ...range, accountId: effectiveAccountId ?? undefined });

  const isCurrentMonth = period.y === now.getFullYear() && period.m === now.getMonth();
  const balance = account ? account.balance : total;

  const { income, expenses } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const t of txs ?? []) {
      if (t.type === "INCOME") income += t.amount;
      if (t.type === "EXPENSE") expenses += t.amount;
    }
    return { income, expenses };
  }, [txs]);
  const net = income - expenses;
  const startBalance = balance - net;
  const pct = startBalance > 0 ? (net / startBalance) * 100 : null;

  const ofKind = useMemo(() => (txs ?? []).filter((t) => t.type === kind), [txs, kind]);

  const drillCategory = drill ? categoriesById.get(drill) : undefined;

  const rows = useMemo<Row[]>(() => {
    const groups = new Map<string, { amount: number; sample: Transaction }>();
    const source = drill ? ofKind.filter((t) => (t.categoryId ?? NONE) === drill) : ofKind;
    for (const t of source) {
      const key = drill ? (t.subcategoryId ?? NONE) : (t.categoryId ?? NONE);
      const g = groups.get(key);
      if (g) g.amount += t.amount;
      else groups.set(key, { amount: t.amount, sample: t });
    }
    const sum = source.reduce((acc, t) => acc + t.amount, 0);
    const parent: CategoryView | undefined = drill ? categoriesById.get(drill) : undefined;
    return [...groups.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([id, g], i): Row => {
        const cat = id === NONE ? undefined : categoriesById.get(id);
        if (drill) {
          const color = parent ? shade(parent.color, i) : NEUTRAL;
          return {
            id,
            name: cat?.name ?? (id === NONE ? "Sin subcategoría" : (g.sample.subcategoryName ?? "Subcategoría")),
            amount: g.amount,
            pct: sum ? (g.amount / sum) * 100 : 0,
            color,
            icon: parent?.icon ?? "archive",
            gradient: id !== NONE,
            drillable: false,
          };
        }
        return {
          id,
          name: cat?.name ?? (id === NONE ? "Sin clasificar" : (g.sample.categoryName ?? "Categoría")),
          amount: g.amount,
          pct: sum ? (g.amount / sum) * 100 : 0,
          color: cat?.color ?? NEUTRAL,
          icon: cat?.icon ?? (id === NONE ? "card" : "archive"),
          drillable: true,
        };
      });
  }, [ofKind, drill, categoriesById]);

  const chartTotal = rows.reduce((acc, r) => acc + r.amount, 0);

  const openRow = (id: string) => {
    if (drill) return;
    if (id === NONE) router.push("/transacciones?tab=clasificar");
    else {
      setDrill(id);
      listRef.current?.scrollTo({ top: 0 });
    }
  };

  /* ----- Compactar el gráfico al desplazar la lista ----- */
  const listRef = useRef<HTMLDivElement>(null);
  const lastTop = useRef(0);
  const compactAt = useRef(0);
  const touchY = useRef<number | null>(null);

  const doCompact = () => {
    if (compact) return;
    compactAt.current = Date.now();
    setCompact(true);
  };
  const doExpand = () => {
    if (!compact || Date.now() - compactAt.current < 400) return;
    setCompact(false);
  };

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    if (top > 2 && top > lastTop.current) doCompact();
    else if (top <= 0 && lastTop.current > 0) doExpand();
    lastTop.current = top;
  };
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (e.deltaY > 0) doCompact();
    else if (e.deltaY < 0 && e.currentTarget.scrollTop <= 0) doExpand();
  };
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (touchY.current === null) return;
    const dy = touchY.current - e.touches[0].clientY;
    if (dy > 12) doCompact();
    else if (dy < -12 && e.currentTarget.scrollTop <= 0) doExpand();
  };

  const kindWord = kind === "EXPENSE" ? "gastos" : "ingresos";
  const shiftMonth = (delta: number) => {
    setDrill(null);
    setPeriod((p) => {
      const d = new Date(p.y, p.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-xl shrink-0 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-6">
        {/* Cabecera: menú + selector de cuenta */}
        <div className="relative flex h-11 items-center justify-center">
          <SidebarToggle className="absolute left-0" />
          <button
            onClick={() => setPicker(true)}
            className="flex h-10 max-w-[60%] items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium transition hover:bg-surface-2"
          >
            <span className="size-2 shrink-0 rounded-full" style={{ background: account?.color ?? "#34d399" }} />
            <span className="truncate">
              {account ? account.name : `Total · ${accounts.length} ${accounts.length === 1 ? "cuenta" : "cuentas"}`}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted" />
          </button>
        </div>

        {/* Balance */}
        <div
          className={`overflow-hidden text-center transition-all duration-300 ${compact ? "mt-3" : "mt-6"}`}
        >
          <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
            {account ? `Balance ${account.name}` : "Balance total"}
          </p>
          <p className={`num mt-1 font-semibold transition-all duration-300 ${compact ? "text-3xl" : "text-[44px] leading-tight"}`}>
            {loadingAccounts ? "—" : money(balance)} <span className="text-lg font-medium text-muted">EUR</span>
          </p>
          {!compact && (
            <p className={`mt-1 text-sm font-medium ${net >= 0 ? "text-ok" : "text-danger"}`}>
              {isCurrentMonth && pct !== null
                ? `${net >= 0 ? "▲" : "▼"} ${Math.abs(pct).toLocaleString("es-ES", { maximumFractionDigits: 1 })}% este mes`
                : `${net >= 0 ? "+" : "-"}${money(Math.abs(net))} EUR en ${monthLabel(period.y, period.m).split(" ")[0]}`}
            </p>
          )}
        </div>

        <Tabs
          className="mt-5"
          value={kind}
          onChange={(k) => {
            setKind(k);
            setDrill(null);
          }}
          options={[
            { value: "EXPENSE", label: "Gastos" },
            { value: "INCOME", label: "Ingresos" },
          ]}
        />

        {/* Periodo + cambio de gráfico */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-cream"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-28 text-center text-sm font-medium capitalize">{monthLabel(period.y, period.m)}</span>
            <button
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
              className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-cream"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            onClick={() => {
              compactAt.current = 0;
              setCompact((c) => !c);
            }}
            aria-label={compact ? "Ver gráfico circular" : "Ver gráfico de barras"}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-cream"
          >
            {compact ? <ChartPie className="size-[18px]" /> : <ChartNoAxesColumn className="size-[18px]" />}
          </button>
        </div>

        {/* Gráfico */}
        <div className="relative">
          {compact ? (
            <div className="animate-fade-in pt-2 pb-1">
              <StackedBar slices={rows} total={chartTotal} />
              <p className="num mt-3 text-center text-2xl font-semibold">
                {money(chartTotal)} <span className="text-sm font-medium text-muted">EUR</span>
              </p>
            </div>
          ) : (
            <div className="animate-fade-in py-2">
              <DonutChart
                slices={rows}
                total={chartTotal}
                label={drillCategory ? drillCategory.name : `Total ${kindWord}`}
                onSelect={drill ? undefined : openRow}
              />
            </div>
          )}
        </div>

        {/* Cabecera de lista */}
        <div className="mt-4 flex items-end justify-between border-b border-line pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
              {drill ? "Subcategorías" : "Categorías"}
            </p>
            {drill ? (
              <button onClick={() => setDrill(null)} className="mt-0.5 flex items-center gap-1.5 text-xl font-semibold">
                <ArrowLeft className="size-5" />
                <span className="truncate">{drillCategory?.name ?? "Categoría"}</span>
              </button>
            ) : (
              <h2 className="mt-0.5 text-xl font-semibold">Tus {kindWord}</h2>
            )}
          </div>
          <Link href="/transacciones" className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent">
            Transacciones <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Lista: es lo único que se desplaza */}
      <div
        ref={listRef}
        onScroll={onScroll}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        className="no-scrollbar flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto w-full max-w-xl px-4 pb-28 sm:px-6">
          {isLoading && !txs ? (
            <div className="grid place-items-center py-14">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-6" />}
              title={`Sin ${kindWord} este mes`}
              text="Añade un movimiento con el botón + para empezar a ver tus estadísticas."
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => openRow(r.id)}
                    disabled={!r.drillable}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition enabled:hover:bg-surface/70"
                  >
                    <IconBadge icon={r.icon} color={drill ? (drillCategory?.color ?? r.color) : r.color} variant={r.gradient ? "gradient" : "soft"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.name}</p>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${r.pct}%`, background: r.color }} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num font-semibold">
                        {money(r.amount)} <span className="text-xs font-normal text-muted">EUR</span>
                      </p>
                      <p className="num text-xs font-semibold" style={{ color: r.color }}>
                        {Math.round(r.pct)}%
                      </p>
                    </div>
                    {r.drillable && <ChevronRight className="size-4 shrink-0 text-faint" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Fab />
      <AccountPickerModal open={picker} value={effectiveAccountId} onClose={() => setPicker(false)} onSelect={selectAccount} />
    </div>
  );
}
