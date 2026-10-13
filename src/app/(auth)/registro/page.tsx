import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Crear cuenta · Cushqui" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
