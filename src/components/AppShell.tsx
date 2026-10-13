"use client";

import { ChartColumn, LayoutGrid, List, LogOut, PanelLeft, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useSWRConfig } from "swr";
import { api, LOGOUT_EVENT, tokens } from "@/lib/api";
import { useMe, useUnclassifiedCount } from "@/lib/hooks";
import { Spinner } from "./ui";

const NAV = [
  { href: "/", label: "Inicio", icon: ChartColumn },
  { href: "/transacciones", label: "Transacciones", icon: List },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/categorias", label: "Categorías", icon: LayoutGrid },
];

const SidebarContext = createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

/** Botón para mostrar u ocultar el menú lateral. */
export function SidebarToggle({ className = "" }: { className?: string }) {
  const { open, toggle } = useSidebar();
  return (
    <button
      onClick={toggle}
      aria-label={open ? "Ocultar menú" : "Mostrar menú"}
      aria-expanded={open}
      className={`grid size-10 place-items-center rounded-xl border border-line bg-bg text-cream/80 transition hover:bg-surface hover:text-cream ${className}`}
    >
      <PanelLeft className="size-[18px]" />
    </button>
  );
}

const SIDEBAR_KEY = "cushqui.sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  // Guardia de sesión: sin token se vuelve al login.
  useEffect(() => {
    if (!tokens.access) {
      router.replace("/login");
      return;
    }
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(SIDEBAR_KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de preferencias del navegador
    setOpen(desktop && stored !== "closed");
    setReady(true);
    const onLogout = () => router.replace("/login");
    window.addEventListener(LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(LOGOUT_EVENT, onLogout);
  }, [router]);

  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (window.matchMedia("(min-width: 1024px)").matches) {
        try {
          localStorage.setItem(SIDEBAR_KEY, next ? "open" : "closed");
        } catch {}
      }
      return next;
    });
  }, []);

  // En móvil el menú se cierra al navegar.
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar el panel al cambiar de ruta
      setOpen(false);
    }
  }, [pathname]);

  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <SidebarContext.Provider value={{ open, toggle }}>
      <div className="flex h-dvh overflow-hidden">
        {/* Fondo oscuro del menú en móvil */}
        {open && (
          <div className="fixed inset-0 z-40 animate-fade-in bg-black/60 backdrop-blur-sm lg:hidden" onClick={toggle} />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-[#0c0c0f] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] lg:static lg:z-auto lg:transition-[margin] ${
            open ? "translate-x-0 lg:ml-0" : "-translate-x-full lg:-ml-64 lg:translate-x-0"
          }`}
        >
          <Sidebar />
        </aside>
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggle } = useSidebar();
  const { data: me } = useMe();
  const pending = useUnclassifiedCount();
  const { cache } = useSWRConfig();

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    tokens.clear();
    for (const key of cache.keys()) cache.delete(key);
    router.replace("/login");
  };

  return (
    <div className="flex h-full flex-col px-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
      <div className="mb-6 flex items-center gap-3 px-1">
        <span className="grid size-10 place-items-center rounded-xl bg-cream font-display text-lg font-bold text-ink">C</span>
        <span className="flex-1 font-display text-lg font-semibold">Cushqui</span>
        <button
          onClick={toggle}
          aria-label="Ocultar menú"
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-cream"
        >
          <PanelLeft className="size-[18px]" />
        </button>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${
                active ? "bg-surface text-accent" : "text-cream/75 hover:bg-surface/60 hover:text-cream"
              }`}
            >
              <Icon className="size-[18px]" strokeWidth={1.8} />
              <span className="flex-1">{label}</span>
              {href === "/transacciones" && pending > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-fab px-1.5 text-[11px] font-bold text-ink">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-line pt-4">
        {me && <p className="truncate px-3 pb-2 text-xs text-muted">{me.email}</p>}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-cream/75 transition hover:bg-surface/60 hover:text-cream"
        >
          <LogOut className="size-[18px]" strokeWidth={1.8} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/** Contenedor estándar de pantalla con scroll propio y botón de menú. */
export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className={`mx-auto w-full max-w-xl px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-28 sm:px-6 ${className}`}
      >
        <SidebarToggle />
        {children}
      </div>
    </div>
  );
}
