import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Iniciar sesión · Cushqui" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
