"use client";

import { useEffect, type ReactNode } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "./Toast";

/** true si el elemento está dentro de algo que realmente puede desplazarse (vertical u horizontal). */
function insideScrollable(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    const s = getComputedStyle(el);
    const y = (s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight;
    const x = (s.overflowX === "auto" || s.overflowX === "scroll") && el.scrollWidth > el.clientWidth;
    if (y || x || el.tagName === "TEXTAREA" || el.tagName === "INPUT") return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * iOS ignora `user-scalable=no` en algunos casos, así que el zoom con dos dedos
 * se bloquea también aquí. El desplazamiento con un dedo no se ve afectado.
 */
function useNoPinchZoom() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
        return;
      }
      // Arrastrar fuera de una lista no debe mover la pantalla (rebote de iOS).
      if (!insideScrollable(e.target)) e.preventDefault();
    };
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
}

export function Providers({ children }: { children: ReactNode }) {
  useNoPinchZoom();
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
        keepPreviousData: true,
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </SWRConfig>
  );
}
