"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui";

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

/** Valor que el backend devuelve una sola vez (token o código): aviso, valor seleccionable y botón de copiar. */
export function SecretStep({
  value,
  hint,
  testId,
  onDone,
  onCopied,
}: {
  value: string;
  hint: string;
  testId?: string;
  onDone: () => void;
  onCopied: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(value)) {
      setCopied(true);
      onCopied();
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="flex gap-2.5 rounded-xl bg-warn/10 px-3 py-2.5 text-sm text-warn">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <span>{hint}</span>
      </p>
      <p
        data-testid={testId}
        className="rounded-xl border border-line bg-bg px-3 py-3 font-mono text-[13px] leading-relaxed break-all text-cream select-all"
      >
        {value}
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
