// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderActionBar, type OrderActionBarProps } from "./OrderActionBar";

/** Collapsed on phones only: the class hides it below `md`, desktop always shows it. */
const MOBILE_HIDDEN = "max-md:hidden";

function renderBar(overrides: Partial<OrderActionBarProps> = {}) {
  const props: OrderActionBarProps = {
    totals: { total: 1_500_000, available: 1_000_000, units: 3 },
    lineCount: 2,
    savedTotal: null,
    editing: true,
    zone: "Interior",
    pending: false,
    canEdit: true,
    canDispatch: true,
    onEdit: vi.fn(),
    onSave: vi.fn(),
    onReviewDispatch: vi.fn(),
    ...overrides,
  };
  render(<OrderActionBar {...props} />);
  return props;
}

const isMobileHidden = (element: HTMLElement) => element.closest(`.${CSS.escape(MOBILE_HIDDEN)}`) !== null;

describe("OrderActionBar on phones", () => {
  it("keeps only the total and the primary action pinned while collapsed (Interior: dispatch)", () => {
    renderBar();

    expect(isMobileHidden(screen.getByText("Total del pedido"))).toBe(false);
    expect(isMobileHidden(screen.getByRole("button", { name: /Revisar y despachar/ }))).toBe(false);

    expect(isMobileHidden(screen.getByText("Con stock ahora"))).toBe(true);
    expect(isMobileHidden(screen.getByText("Títulos · ejemplares"))).toBe(true);
    expect(isMobileHidden(screen.getByRole("button", { name: "Guardar sin despachar" }))).toBe(true);
  });

  it("collapses the dispatch action instead of saving in AMBA", () => {
    renderBar({ zone: "AMBA" });

    expect(isMobileHidden(screen.getByRole("button", { name: "Guardar cambios" }))).toBe(false);
    expect(isMobileHidden(screen.getByRole("button", { name: /Revisar y despachar/ }))).toBe(true);
  });

  it("reveals the details and the secondary action with an accessible toggle", () => {
    const props = renderBar({ savedTotal: 2_000_000 });
    const toggle = screen.getByRole("button", { name: "Ver detalle" });

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const controlled = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(controlled?.contains(screen.getByText("Con stock ahora"))).toBe(true);

    fireEvent.click(toggle);

    const expanded = screen.getByRole("button", { name: "Ocultar detalle" });
    expect(expanded.getAttribute("aria-expanded")).toBe("true");
    expect(isMobileHidden(screen.getByText("Con stock ahora"))).toBe(false);
    expect(isMobileHidden(screen.getByText("Cambios sin guardar"))).toBe(false);
    const save = screen.getByRole("button", { name: "Guardar sin despachar" });
    expect(isMobileHidden(save)).toBe(false);

    fireEvent.click(save);
    expect(props.onSave).toHaveBeenCalledOnce();
  });

  it("keeps Modificar visible outside edit mode", () => {
    renderBar({ editing: false });

    expect(isMobileHidden(screen.getByRole("button", { name: "Modificar" }))).toBe(false);
  });
});
