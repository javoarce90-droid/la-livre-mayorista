// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { diffOrder, type OrderLine } from "../domain/order";
import { DispatchReviewModal } from "./DispatchReviewModal";

const base: Omit<OrderLine, "bookCode" | "title" | "quantity" | "availability"> = {
  isbn: "9780000000001",
  originalDate: "2026-08-18",
  unitPrice: 1_000_000,
  discountPercent: 0,
  promotionPercent: 0,
  observation: null,
};

const saved: OrderLine[] = [
  { ...base, bookCode: "1", title: "Rayuela", quantity: 4, availability: "immediate" },
  { ...base, bookCode: "2", title: "Bestiario", quantity: 1, availability: "immediate" },
];
const draft: OrderLine[] = [
  { ...base, bookCode: "1", title: "Rayuela", quantity: 2, availability: "immediate" },
  { ...base, bookCode: "3", title: "Facundo", quantity: 1, availability: "out_of_stock" },
];

function renderModal(overrides: Partial<Parameters<typeof DispatchReviewModal>[0]> = {}) {
  const props = {
    lines: draft,
    diff: diffOrder(saved, draft),
    zone: "Interior" as const,
    pending: false,
    error: null,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<DispatchReviewModal {...props} />);
  return props;
}

describe("DispatchReviewModal", () => {
  it("summarizes what ships now, what waits and what changed", () => {
    renderModal();
    expect(screen.getByText(/Al despacharlo, el pedido se cierra/)).toBeTruthy();
    expect(screen.getByText(/Con stock ahora \(1 título\)/)).toBeTruthy();
    expect(screen.getByText(/Sin stock o a pedido \(1 título\)/)).toBeTruthy();
    expect(screen.getByText("Agregado:")).toBeTruthy();
    expect(screen.getByText("Quitado:")).toBeTruthy();
    expect(screen.getByText("4 → 2")).toBeTruthy();
  });

  it("names the action and the amount on the confirm button, and starts on the safe choice", () => {
    renderModal();
    const confirm = screen.getByRole("button", { name: /Despachar pedido · \$ 30\.000,00/ });
    expect(confirm).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Volver al pedido" }));
  });

  it("calls onConfirm once and blocks double submission while pending", () => {
    const { onConfirm } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Despachar pedido/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables both actions while dispatching", () => {
    renderModal({ pending: true });
    expect((screen.getByRole("button", { name: /Despachando/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Volver al pedido" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the dialog open with the error and reassures that nothing was lost", () => {
    renderModal({ error: "El pedido está bloqueado mientras lo procesamos. No se guardaron los cambios." });
    expect(screen.getByRole("alert").textContent).toMatch(/Tus cambios siguen acá/);
  });
});
