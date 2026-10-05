import type { Credentials } from "../domain/credentials";
import type { User } from "../domain/user";

/** Port: verifies credentials (mock today, La Livre API tomorrow). */
export interface UserDirectory {
  authenticate(credentials: Credentials): Promise<User | null>;
}
