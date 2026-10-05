import type { LoginError } from "../application/login";

export function loginErrorMessage(error: LoginError): string {
  switch (error) {
    case "invalid_email":
      return "Ingresá un email válido.";
    case "missing_password":
      return "Ingresá tu contraseña.";
    case "invalid_credentials":
      return "El email o la contraseña no son correctos. Revisalos e intentá de nuevo.";
  }
}
