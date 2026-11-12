import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { container } from "@/composition";
import { LOGIN_PATH, SET_PASSWORD_PATH } from "@/modules/auth/domain/auth-paths";
import { AuthLayout } from "@/modules/auth/ui/AuthLayout";
import { SetPasswordForm } from "@/modules/auth/ui/SetPasswordForm";

export const metadata: Metadata = { title: "Elegir contraseña" };

/** Reached after accepting an invitation, after a recovery email, or from the account menu. */
export default async function SetPasswordPage() {
  const user = await container().auth.currentUser();
  if (!user) redirect(`${LOGIN_PATH}?next=${encodeURIComponent(SET_PASSWORD_PATH)}`);
  return (
    <AuthLayout title="Elegir contraseña" description={`Vas a usarla para ingresar con ${user.email}.`}>
      <SetPasswordForm email={user.email} />
    </AuthLayout>
  );
}
