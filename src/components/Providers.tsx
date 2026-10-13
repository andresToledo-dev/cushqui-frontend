"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { ToastProvider } from "./Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ revalidateOnFocus: true, shouldRetryOnError: false, keepPreviousData: true }}>
      <ToastProvider>{children}</ToastProvider>
    </SWRConfig>
  );
}
