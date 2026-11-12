import type { Metadata } from "next";
import { AuthLayout } from "@/modules/auth/ui/AuthLayout";
import { ForgotPasswordForm } from "@/modules/auth/ui/ForgotPasswordForm";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Recuperar contraseña" description="Te enviamos un enlace por email para elegir una contraseña nueva.">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
