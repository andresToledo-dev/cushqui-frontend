"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { cleanPhrase, MAX_PHRASE_LENGTH, MAX_PHRASES, MAX_WORD_LENGTH, MAX_WORDS, validatePhrase } from "@/lib/notificationWords";
import { Button, Input, Modal, SectionLabel } from "./ui";

/**
 * Lista de frases de un bloque (INGRESO o GASTO): añadir, editar y eliminar, como las subcategorías.
 * `others` son las frases del otro bloque, para no repetirlas.
 * `minOne` impide borrar la última frase (al editar una integración nunca pueden quedar vacías).
 */
export function WordsEditor({
  label,
  tone,
  phrases,
  others,
  onChange,
  minOne = false,
  invalid = false,
}: {
  label: string;
  tone: "income" | "expense";
  phrases: string[];
  others: string[];
  onChange: (phrases: string[]) => void;
  minOne?: boolean;
  invalid?: boolean;
}) {
  const [editing, setEditing] = useState<{ index?: number; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const full = phrases.length >= MAX_PHRASES;
  const lastOne = minOne && phrases.length <= 1;

  const open = (index?: number) => {
    setError(null);
    setEditing({ index, text: index === undefined ? "" : phrases[index] });
  };

  const save = () => {
    if (!editing) return;
    const used = [...phrases.filter((_, i) => i !== editing.index), ...others];
    const problem = validatePhrase(editing.text, used);
    if (problem) {
      setError(problem);
      return;
    }
    const phrase = cleanPhrase(editing.text);
    onChange(editing.index === undefined ? [...phrases, phrase] : phrases.map((p, i) => (i === editing.index ? phrase : p)));
    setEditing(null);
  };

  return (
    <div data-testid={`words-${tone}`}>
      <div className="mb-2.5 flex items-center justify-between">
        <SectionLabel className="mb-0">
          <span className={tone === "income" ? "text-ok" : "text-danger"}>{label}</span>{" "}
          <span className="normal-case tracking-normal text-faint">
            {phrases.length}/{MAX_PHRASES}
          </span>
        </SectionLabel>
        {!full && (
          <button
            type="button"
            onClick={() => open()}
            aria-label={`Añadir frase de ${label.toLowerCase()}`}
            className="flex items-center gap-1 text-sm font-medium text-cream/80 hover:text-cream"
          >
            <Plus className="size-4" /> Añadir
          </button>
        )}
      </div>
      {phrases.length === 0 ? (
        <p
          className={`rounded-2xl py-5 text-center text-sm ${invalid ? "bg-danger/10 text-danger" : "bg-surface text-muted"}`}
        >
          Sin frases
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {phrases.map((p, i) => (
            <li key={p} className="flex items-center gap-3 rounded-2xl bg-surface py-1.5 pr-2 pl-4">
              <span className="flex-1 truncate font-medium">{p}</span>
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={`Editar ${p}`}
                className="grid size-10 place-items-center rounded-xl text-cream/70 hover:bg-surface-2 hover:text-cream"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(phrases.filter((_, k) => k !== i))}
                disabled={lastOne}
                aria-label={`Eliminar ${p}`}
                title={lastOne ? "Debe quedar al menos una frase" : undefined}
                className="grid size-10 place-items-center rounded-xl text-danger hover:bg-danger/10 disabled:text-faint disabled:hover:bg-transparent"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {lastOne && <p className="mt-1.5 px-1 text-xs text-faint">Debe quedar al menos una frase.</p>}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`${editing?.index === undefined ? "Nueva" : "Editar"} frase de ${label.toLowerCase()}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input
            autoFocus
            placeholder="Ej.: has enviado"
            aria-label="Frase"
            maxLength={MAX_PHRASE_LENGTH}
            value={editing?.text ?? ""}
            onChange={(e) => {
              setError(null);
              setEditing((m) => (m ? { ...m, text: e.target.value } : m));
            }}
          />
          {error ? (
            <p role="alert" className="mt-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : (
            <p className="mt-2 px-1 text-xs text-faint">
              Hasta {MAX_WORDS} palabras de {MAX_WORD_LENGTH} caracteres, sin comas ni caracteres especiales.
            </p>
          )}
          <Button type="submit" className="mt-4 w-full" disabled={!editing?.text.trim()}>
            Guardar
          </Button>
          <Button type="button" variant="ghost" className="mt-1 w-full" onClick={() => setEditing(null)}>
            Cancelar
          </Button>
        </form>
      </Modal>
    </div>
  );
}
