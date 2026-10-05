import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";
import { validateLoginInput, type CredentialsError } from "../domain/credentials";
import type { User } from "../domain/user";
import type { UserDirectory } from "./user-directory";

export type LoginError = CredentialsError | "invalid_credentials";

export async function login(
  users: UserDirectory,
  input: { email: string; password: string },
): Promise<Result<User, LoginError>> {
  const credentials = validateLoginInput(input.email, input.password);
  if (!credentials.ok) return credentials;
  const user = await users.authenticate(credentials.value);
  return user ? ok(user) : err("invalid_credentials");
}
