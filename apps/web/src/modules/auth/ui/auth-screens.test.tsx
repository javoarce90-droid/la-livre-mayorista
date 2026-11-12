// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { LoginScreen } from "./LoginScreen";
import { RESET_REQUESTED_MESSAGE } from "./messages";

const actions = vi.hoisted(() => ({
  loginAction: vi.fn(),
  requestPasswordResetAction: vi.fn(async () => ({ error: null, sent: true, email: "a@b.com" })),
}));
vi.mock("./actions", () => actions);

describe("LoginScreen", () => {
  it("links to the password reset page", () => {
    render(<LoginScreen showDemoHint={false} />);
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).getAttribute("href")).toBe("/login/olvide");
    expect(screen.queryByText(/Demo:/)).toBeNull();
  });

  it("shows a notice passed through the URL", () => {
    render(<LoginScreen showDemoHint={false} notice="Tu usuario no tiene una cuenta habilitada." />);
    expect(screen.getByRole("alert").textContent).toContain("Tu usuario no tiene una cuenta habilitada.");
  });
});

describe("ForgotPasswordForm", () => {
  it("replaces the form with the same neutral confirmation after sending", async () => {
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText(RESET_REQUESTED_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar enlace" })).toBeNull();
    expect(screen.getByRole("link", { name: "Volver a iniciar sesión" })).toBeTruthy();
  });
});
