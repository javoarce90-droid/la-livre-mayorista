import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readSessionUser } from "@/modules/auth/infrastructure/cookie-session";
import { LoginScreen } from "@/modules/auth/ui/LoginScreen";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await readSessionUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <LoginScreen
      next={typeof next === "string" ? next : undefined}
      showDemoHint={process.env.NODE_ENV !== "production" || process.env.LALIVRE_SHOW_DEMO_HINT === "1"}
    />
  );
}
