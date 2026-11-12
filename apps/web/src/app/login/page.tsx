import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { container } from "@/composition";
import { HOME_PATH } from "@/modules/account/domain/portal-sections";
import { isLoginNotice } from "@/modules/auth/domain/auth-paths";
import { readSupabaseConfig } from "@/modules/auth/infrastructure/supabase/supabase-config";
import { LoginScreen } from "@/modules/auth/ui/LoginScreen";
import { loginNoticeMessage } from "@/modules/auth/ui/messages";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const notice = isLoginNotice(error) ? loginNoticeMessage(error) : undefined;
  // With a notice the user was just signed out on purpose: never bounce back to the portal.
  if (!notice && (await container().auth.currentUser())) redirect(HOME_PATH);
  const demoAuth = !readSupabaseConfig(process.env);
  return (
    <LoginScreen
      next={typeof next === "string" ? next : undefined}
      notice={notice}
      showDemoHint={demoAuth && (process.env.NODE_ENV !== "production" || process.env.LALIVRE_SHOW_DEMO_HINT === "1")}
    />
  );
}
