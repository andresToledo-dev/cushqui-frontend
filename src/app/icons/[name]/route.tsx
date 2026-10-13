import { appIcon } from "@/lib/app-icon";

// Iconos del manifest de la PWA, generados en el build.
const ICONS: Record<string, { size: number; maskable?: boolean }> = {
  "192": { size: 192 },
  "512": { size: 512 },
  "maskable-512": { size: 512, maskable: true },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[name]">) {
  const { name } = await ctx.params;
  const { size, maskable } = ICONS[name];
  return appIcon(size, { maskable });
}
