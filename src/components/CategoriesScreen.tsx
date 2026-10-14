"use client";

import { LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCategories } from "@/lib/hooks";
import type { CategoryKind } from "@/lib/types";
import { FixedScreen, SidebarToggle } from "./AppShell";
import { EmptyState, Fab, IconBadge, Spinner, Tabs } from "./ui";

export function CategoriesScreen({ initialKind = "EXPENSE" }: { initialKind?: CategoryKind }) {
  const [kind, setKind] = useState<CategoryKind>(initialKind);
  const { categories, isLoading } = useCategories();
  const list = categories.filter((c) => c.kind === kind);
  const tipo = kind === "INCOME" ? "ingresos" : "gastos";

  return (
    <>
      <FixedScreen
        toggle={false}
        header={
          <div className="border-b border-line pb-4">
            <div className="relative flex h-11 items-center justify-center">
              <SidebarToggle className="absolute left-0" />
              <h1 className="text-[15px] text-cream/70">Categorías</h1>
            </div>
            <Tabs
              size="sm"
              className="mx-auto mt-4 max-w-xs"
              value={kind}
              onChange={setKind}
              options={[
                { value: "EXPENSE", label: "GASTOS" },
                { value: "INCOME", label: "INGRESOS" },
              ]}
            />
          </div>
        }
      >

        {isLoading && categories.length === 0 ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="size-6" />}
            title={`Sin categorías de ${tipo}`}
            text="Crea una categoría para organizar tus movimientos."
          />
        ) : (
          <ul className="mt-6 grid grid-cols-3 gap-x-2 gap-y-7 sm:grid-cols-4">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/categorias/${c.id}`}
                  className="group flex flex-col items-center gap-2.5 text-center"
                >
                  <IconBadge
                    icon={c.icon}
                    color={c.color}
                    size="lg"
                    className="transition group-hover:scale-105 group-active:scale-95"
                  />
                  <span className="line-clamp-2 px-1 text-[13px] font-medium">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={`/categorias/nueva?tipo=${tipo}`}
          className="mt-10 flex h-12 items-center justify-center gap-2 rounded-2xl bg-cream font-semibold text-ink transition hover:bg-white active:scale-[0.98]"
        >
          <Plus className="size-4" /> Añadir categoría
        </Link>
      </FixedScreen>
      <Fab />
    </>
  );
}
