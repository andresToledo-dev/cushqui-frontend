"use client";

import { ArrowLeft, ChartNoAxesColumn, ChartPie, ChevronDown, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { money } from "@/lib/format";
import { useAccounts, useCategories, useTransactions, type CategoryView } from "@/lib/hooks";
import { NEUTRAL } from "@/lib/icons";
import { containsNow, periodRange, thisPeriodWord } from "@/lib/period";
import { usePeriod } from "@/lib/period-store";
import { HOME_ACCOUNT_KEY } from "@/lib/prefs";
import type { Transaction } from "@/lib/types";
import { AccountPickerModal } from "./AccountPickerModal";
import { SidebarToggle } from "./AppShell";
import { categoryTransactionsHref } from "./CategoryTransactionsScreen";
import { DonutChart, StackedBar, type Slice } from "./charts";
import { PeriodFilter } from "./PeriodFilter";
import { EmptyState, Fab, IconBadge, Spinner, Tabs } from "./ui";

type Kind = "EXPENSE" | "INCOME";
type ChartMode = "donut" | "bar";
const NONE = "__none";
const VIEW_KEY = "cushqui.home.view";
const CHART_KEY = "cushqui.home.chart";

/**
 * Nivel del gráfico: categorías, o subcategorías de una categoría.
 * La lista de movimientos se abre en su propia pantalla (/categorias/[id]/movimientos).
 */
type View = { level: "categories" } | { level: "subcategories"; categoryId: string };

interface Row extends Slice {
  icon: string;
  pct: number;
  gradient?: boolean;
}

/** Tonos de un mismo color, solo para subcategorías sin color propio o repetido. */
function shade(color: string, i: number): string {
  if (i === 0) return color;
  const mix = i % 2 === 1 ? "#ffffff" : "#000000";
  const amount = Math.min(15 + Math.floor((i + 1) / 2) * 14, 70);
  return `color-mix(in srgb, ${color} ${100 - amount}%, ${mix})`;
}

/** Cuenta elegida (localStorage), pestaña y nivel para volver de una lista (sessionStorage) y tipo de gráfico. */
function readSaved(): { kind: Kind; view: View; accountId: string | null; chart: ChartMode } {
  const out: { kind: Kind; view: View; accountId: string | null; chart: ChartMode } = {
    kind: "EXPENSE",
    view: { level: "categories" },
    accountId: null,
    chart: "donut",
  };
  try {
    out.accountId = localStorage.getItem(HOME_ACCOUNT_KEY);
    if (localStorage.getItem(CHART_KEY) === "bar") out.chart = "bar";
    const v = JSON.parse(sessionStorage.getItem(VIEW_KEY) ?? "null") as { kind?: Kind; view?: View } | null;
    if (v?.kind === "EXPENSE" || v?.kind === "INCOME") out.kind = v.kind;
    if (v?.view?.level === "subcategories" && v.view.categoryId) out.view = v.view;
  } catch {}
  return out;
}

const sum = (txs: Transaction[]) => txs.reduce((acc, t) => acc + t.amount, 0);

export function HomeScreen() {
  const router = useRouter();
  const [period, setPeriod] = usePeriod();
  // Inicio solo se pinta en el cliente (AppShell espera a montar), así que se puede leer el almacenamiento aquí.
  const [saved] = useState(readSaved);
  const [kind, setKind] = useState<Kind>(saved.kind);
  const [accountId, setAccountId] = useState<string | null>(saved.accountId);
  const [accountPicker, setAccountPicker] = useState(false);
  const [view, setView] = useState<View>(saved.view);
  const [chart, setChart] = useState<ChartMode>(saved.chart);
  const [chartVisible, setChartVisible] = useState(true);
  // Alto visible del contenedor: la lista ocupa al menos eso, así el gráfico siempre puede subir del todo.
  const [listMinHeight, setListMinHeight] = useState(0);

  const { accounts, total, byId: accountsById, loaded: accountsLoaded } = useAccounts();
  const { byId: categoriesById } = useCategories();

  useEffect(() => {
    try {
      sessionStorage.setItem(VIEW_KEY, JSON.stringify({ kind, view }));
    } catch {}
  }, [kind, view]);

  // Si la cuenta guardada ya no existe se vuelve a "Total".
  const account = accountId ? accountsById.get(accountId) : undefined;
  const effectiveAccountId = account ? accountId : null;

  const selectAccount = (id: string | null) => {
    setAccountId(id);
    try {
      if (id) localStorage.setItem(HOME_ACCOUNT_KEY, id);
      else localStorage.removeItem(HOME_ACCOUNT_KEY);
    } catch {}
  };

  const toggleChart = () => {
    const next = chart === "donut" ? "bar" : "donut";
    setChart(next);
    try {
      localStorage.setItem(CHART_KEY, next);
    } catch {}
  };

  const range = periodRange(period);
  const {
    data: txs,
    isLoading,
    isValidating,
  } = useTransactions({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    accountId: effectiveAccountId ?? undefined,
  });

  // El saldo viene del backend (cuentas). Aquí solo se calcula la variación del periodo.
  const balance = account ? account.balance : total;
  const net = useMemo(
    () => (txs ?? []).reduce((acc, t) => acc + (t.type === "INCOME" ? t.amount : -t.amount), 0),
    [txs],
  );
  const startBalance = balance - net;
  const pct = containsNow(period) && startBalance > 0 ? (net / startBalance) * 100 : null;

  const ofKind = useMemo(() => (txs ?? []).filter((t) => t.type === kind), [txs, kind]);
  const kindWord = kind === "EXPENSE" ? "gastos" : "ingresos";

  const categoryId = view.level === "subcategories" ? view.categoryId : null;
  const category: CategoryView | undefined = categoryId ? categoriesById.get(categoryId) : undefined;
  const inCategory = useMemo(
    () => (categoryId ? ofKind.filter((t) => t.categoryId === categoryId) : []),
    [ofKind, categoryId],
  );

  const rows = useMemo<Row[]>(() => {
    const bySub = view.level === "subcategories";
    const source = bySub ? inCategory : ofKind;
    const groups = new Map<string, Transaction[]>();
    for (const t of source) {
      const key = bySub ? (t.subcategoryId ?? NONE) : (t.categoryId ?? NONE);
      groups.set(key, [...(groups.get(key) ?? []), t]);
    }
    const all = sum(source);
    const usedColors = new Set<string>();
    return [...groups.entries()]
      .map(([id, list]) => ({ id, list, amount: sum(list) }))
      .sort((a, b) => b.amount - a.amount)
      .map(({ id, list, amount }, i): Row => {
        const pct = all ? (amount / all) * 100 : 0;
        if (bySub) {
          const sub = id === NONE ? undefined : categoriesById.get(id);
          // Cada subcategoría usa su color (un degradado del de la categoría); si falta o se repite, un tono calculado.
          let color = sub?.color && sub.color !== category?.color ? sub.color : "";
          if (!color || usedColors.has(color)) color = category ? shade(category.color, i + 1) : NEUTRAL;
          usedColors.add(color);
          return {
            id,
            name: id === NONE ? "Sin subcategoría" : (sub?.name ?? list[0].subcategoryName ?? "Subcategoría"),
            amount,
            pct,
            color: id === NONE ? NEUTRAL : color,
            icon: category?.icon ?? "archive",
            gradient: id !== NONE,
          };
        }
        const cat = id === NONE ? undefined : categoriesById.get(id);
        return {
          id,
          name: id === NONE ? "Sin clasificar" : (cat?.name ?? list[0].categoryName ?? "Categoría"),
          amount,
          pct,
          color: cat?.color ?? NEUTRAL,
          icon: cat?.icon ?? (id === NONE ? "card" : "archive"),
        };
      });
  }, [view.level, inCategory, ofKind, category, categoriesById]);

  const chartTotal = rows.reduce((acc, r) => acc + r.amount, 0);

  /* ----- Gráfico que se desplaza con la lista ----- */
  // El gráfico es parte del contenido desplazable: sube con el dedo sin saltos. Cuando sale de la vista,
  // la cabecera fija de la lista muestra una barra resumen (de altura constante, así nada se mueve).
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = scrollRef.current;
    const target = chartRef.current;
    if (!root || !target) return;
    const io = new IntersectionObserver(([entry]) => setChartVisible(entry.intersectionRatio > 0.25), {
      root,
      threshold: [0, 0.25, 0.5, 1],
    });
    io.observe(target);
    const ro = new ResizeObserver(() => setListMinHeight(root.clientHeight));
    ro.observe(root);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, [chart]);

  /* ----- Navegación ----- */
  const openList = (catId: string | null, subId?: string | null) =>
    router.push(
      categoryTransactionsHref({ categoryId: catId, subcategoryId: subId, kind, accountId: effectiveAccountId }),
    );

  const openRow = (id: string) => {
    if (view.level === "categories") {
      if (id === NONE) return openList(null);
      // Con subcategorías en el periodo se muestra su gráfico; si no, la lista de movimientos.
      const hasSubs = ofKind.some((t) => t.categoryId === id && t.subcategoryId);
      if (hasSubs) {
        setView({ level: "subcategories", categoryId: id });
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else openList(id);
    } else {
      openList(view.categoryId, id === NONE ? null : id);
    }
  };

  const categoryTitle = category?.name ?? inCategory[0]?.categoryName ?? "Categoría";
  const variation =
    pct !== null
      ? `${net >= 0 ? "▲" : "▼"} ${Math.abs(pct).toLocaleString("es-ES", { maximumFractionDigits: 1 })}% ${thisPeriodWord(period.mode)}`
      : `${net >= 0 ? "+" : "-"}${money(Math.abs(net))} EUR en el periodo`;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Cabecera fija */}
      <div className="mx-auto w-full max-w-xl shrink-0 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:px-6">
        <div className="relative flex h-11 items-center justify-center">
          <SidebarToggle className="absolute left-0" />
          <button
            onClick={() => setAccountPicker(true)}
            className="flex h-10 max-w-[60%] items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium transition hover:bg-surface-2"
          >
            <span className="size-2 shrink-0 rounded-full" style={{ background: account?.color ?? "#34d399" }} />
            <span className="truncate">
              {account ? account.name : `Total · ${accounts.length} ${accounts.length === 1 ? "cuenta" : "cuentas"}`}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted" />
          </button>
        </div>

        <div className="mt-2 text-center">
          <p className="num text-[34px] leading-tight font-semibold" aria-label="Balance">
            {accountsLoaded ? money(balance) : "—"} <span className="text-base font-medium text-muted">EUR</span>
          </p>
          <p className={`h-4 text-xs font-medium ${net >= 0 ? "text-ok" : "text-danger"}`}>
            {txs && accountsLoaded ? variation : ""}
          </p>
        </div>

        <Tabs
          className="mt-3"
          value={kind}
          onChange={(k) => {
            setKind(k);
            setView({ level: "categories" });
          }}
          options={[
            { value: "EXPENSE", label: "Gastos" },
            { value: "INCOME", label: "Ingresos" },
          ]}
        />

        <PeriodFilter
          className="mt-2"
          period={period}
          onChange={setPeriod}
          loading={isValidating && !!txs}
          action={
            <button
              onClick={toggleChart}
              aria-label={chart === "bar" ? "Ver gráfico circular" : "Ver gráfico de barras"}
              className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-cream"
            >
              {chart === "bar" ? <ChartPie className="size-[18px]" /> : <ChartNoAxesColumn className="size-[18px]" />}
            </button>
          }
        />
      </div>

      {/* Contenido desplazable: gráfico + lista */}
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-none">
        <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
          <div ref={chartRef}>
            {chart === "donut" ? (
              <div className="py-3">
                <DonutChart
                  slices={rows}
                  total={chartTotal}
                  loading={!txs}
                  label={view.level === "subcategories" ? categoryTitle : `Total ${kindWord}`}
                  onSelect={openRow}
                />
              </div>
            ) : (
              <div className="pt-4 pb-2">
                <StackedBar slices={rows} total={chartTotal} />
                <p className="num mt-3 text-center text-2xl font-semibold">
                  {txs ? money(chartTotal) : "—"} <span className="text-sm font-medium text-muted">EUR</span>
                </p>
              </div>
            )}
          </div>

          <section className="pb-28" style={{ minHeight: listMinHeight || undefined }}>
          {/* Cabecera de la lista: se queda pegada arriba al desplazar */}
          <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/95 px-4 pt-3 pb-3 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
                  {view.level === "categories" ? "Categorías" : "Subcategorías"}
                </p>
                {view.level === "categories" ? (
                  <h2 className="mt-0.5 text-xl font-semibold">Tus {kindWord}</h2>
                ) : (
                  <button
                    onClick={() => setView({ level: "categories" })}
                    className="mt-0.5 flex max-w-full items-center gap-1.5 text-xl font-semibold"
                  >
                    <ArrowLeft className="size-5 shrink-0" />
                    <span className="truncate">{categoryTitle}</span>
                  </button>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span
                  className={`num text-sm font-semibold transition-opacity duration-200 ${chartVisible ? "opacity-0" : "opacity-100"}`}
                  aria-hidden={chartVisible}
                >
                  {money(chartTotal)} <span className="text-xs font-normal text-muted">EUR</span>
                </span>
                {view.level === "subcategories" ? (
                  <button
                    onClick={() => openList(view.categoryId)}
                    className="flex items-center gap-1 text-sm font-medium text-accent"
                  >
                    Ver todos <ChevronRight className="size-4" />
                  </button>
                ) : (
                  <Link href="/transacciones" className="flex items-center gap-1 text-sm font-medium text-accent">
                    Transacciones <ChevronRight className="size-4" />
                  </Link>
                )}
              </div>
            </div>
            {/* Barra resumen: siempre ocupa su sitio y solo cambia la opacidad */}
            <div
              className={`mt-2.5 transition-opacity duration-200 ${chartVisible ? "opacity-0" : "opacity-100"}`}
              aria-hidden={chartVisible}
            >
              <StackedBar slices={rows} total={chartTotal} size="sm" />
            </div>
          </div>

          {isLoading && !txs ? (
            <div className="grid place-items-center py-14">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-6" />}
              title={`Sin ${kindWord} en este periodo`}
              text="Añade un movimiento con el botón + o elige otro periodo."
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => openRow(r.id)}
                    className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition hover:bg-surface/70"
                  >
                    <IconBadge icon={r.icon} color={r.color} variant={r.gradient ? "gradient" : "soft"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.name}</p>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${r.pct}%`, background: r.color }}
                        />
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
                    <ChevronRight className="size-4 shrink-0 text-faint" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          </section>
        </div>
      </div>

      <Fab />
      <AccountPickerModal
        open={accountPicker}
        value={effectiveAccountId}
        onClose={() => setAccountPicker(false)}
        onSelect={selectAccount}
      />
    </div>
  );
}
