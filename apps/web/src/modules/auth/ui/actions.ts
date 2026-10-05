"use server";

import { redirect } from "next/navigation";
import { container } from "@/composition";
import { login } from "../application/login";
import { endSession, startSession } from "../infrastructure/cookie-session";
import { loginErrorMessage } from "./messages";

export interface LoginFormState {
  error: string | null;
  email: string;
}

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function loginAction(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await login(container().users, { email, password });
  if (!result.ok) return { error: loginErrorMessage(result.error), email };
  await startSession(result.value);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
