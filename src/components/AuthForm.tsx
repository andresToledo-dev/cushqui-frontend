"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useSWRConfig } from "swr";
import { api, ApiError, tokens } from "@/lib/api";
import { Button, Input } from "./ui";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { cache } = useSWRConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  useEffect(() => {
    if (tokens.access) router.replace("/");
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isRegister) {
      if (!PASSWORD_RULE.test(password)) {
        setError("La contraseña necesita 8 caracteres, mayúscula, minúscula, número y un símbolo.");
        return;
      }
      if (password !== confirm) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }
    setBusy(true);
    try {
      const t = isRegister
        ? await api.register(email.trim(), password, email.trim().split("@")[0].slice(0, 100) || "Usuario")
        : await api.login(email.trim(), password);
      tokens.set(t);
      for (const key of cache.keys()) cache.delete(key);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError("Email o contraseña incorrectos.");
      else if (err instanceof ApiError && err.status === 409) setError("Ya existe una cuenta con ese email.");
      else setError(err instanceof Error ? err.message : "Algo salió mal");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-sm animate-pop-in">
        <div className="mb-9 flex flex-col items-center text-center">
          <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-cream font-display text-xl font-bold text-ink">
            C
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {isRegister ? "Crea tu cuenta" : "Bienvenido de nuevo"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {isRegister ? "Empieza a controlar tus gastos" : "Inicia sesión para ver tus finanzas"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Input
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder="Contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-cream"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {isRegister && (
            <Input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirmar contraseña"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
        </div>

        {isRegister && !error && (
          <p className="mt-3 px-1 text-xs text-faint">Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo.</p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="mt-5 w-full">
          {busy ? "Un momento…" : isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </Button>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
          <Link href={isRegister ? "/login" : "/registro"} className="font-semibold text-cream hover:underline">
            {isRegister ? "Inicia sesión" : "Regístrate"}
          </Link>
        </p>
      </form>
    </main>
  );
}
