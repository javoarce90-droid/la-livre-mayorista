import type { ChangePasswordError, LoginError } from "../application/auth-use-cases";
import { MIN_PASSWORD_LENGTH } from "../domain/credentials";
import type { LoginNotice } from "../domain/auth-paths";

export function loginErrorMessage(error: LoginError): string {
  switch (error) {
    case "invalid_email":
      return "Ingresá un email válido.";
    case "missing_password":
      return "Ingresá tu contraseña.";
    case "invalid_credentials":
      return "El email o la contraseña no son correctos. Revisalos e intentá de nuevo.";
    case "rate_limited":
      return "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar.";
    case "unavailable":
      return "No pudimos iniciar sesión en este momento. Intentá de nuevo en unos minutos.";
  }
}

/** Notices that arrive on /login through `?error=`. */
export function loginNoticeMessage(notice: LoginNotice): string {
  switch (notice) {
    case "sin_cuenta":
      return "Tu usuario no tiene una cuenta habilitada. Escribinos a La Livre.";
    case "enlace_invalido":
      return "El enlace ya se usó o venció. Pedí uno nuevo desde «¿Olvidaste tu contraseña?».";
  }
}

export const RESET_REQUESTED_MESSAGE =
  "Si el email corresponde a una cuenta de La Livre, te enviamos un enlace para elegir una contraseña nueva. Revisá tu bandeja de entrada y la carpeta de spam.";

export function changePasswordErrorMessage(error: ChangePasswordError): string {
  switch (error) {
    case "password_too_short":
      return `Usá al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    case "password_too_long":
      return "La contraseña es demasiado larga. Probá con una más corta.";
    case "password_mismatch":
      return "Las contraseñas no coinciden.";
    case "same_password":
      return "La contraseña nueva tiene que ser distinta de la actual.";
    case "weak_password":
      return "Esa contraseña es muy fácil de adivinar. Probá con otra más larga o que combine letras y números.";
    case "reauthentication_needed":
    case "not_signed_in":
      return "Por seguridad, pedí un enlace nuevo desde «¿Olvidaste tu contraseña?» y volvé a intentarlo.";
    case "unsupported":
      return "En el modo demo la contraseña no se puede cambiar.";
    case "unavailable":
      return "No pudimos guardar la contraseña en este momento. Intentá de nuevo en unos minutos.";
  }
}
