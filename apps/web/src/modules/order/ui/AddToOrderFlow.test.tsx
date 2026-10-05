// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddToOrderFlow } from "./AddToOrderFlow";

describe("AddToOrderFlow", () => {
  it("adds after confirming quantity", async () => {
    const onAdd = vi.fn().mockResolvedValue({ status: "added" });
    render(<AddToOrderFlow idPrefix="t" onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: /agregar al pedido actual/i }));
    expect(screen.getByText("Agregando al pedido actual")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText(/Agregaste 3 ejemplares/)).toBeTruthy();
    expect(onAdd).toHaveBeenCalledWith(3, false);
  });

  it("asks for intervention when there is no immediate stock, then confirms", async () => {
    const onAdd = vi
      .fn()
      .mockResolvedValueOnce({ status: "needs_confirmation" })
      .mockResolvedValueOnce({ status: "added" });
    render(<AddToOrderFlow idPrefix="t" onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: /agregar al pedido actual/i }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("El título no tiene stock inmediato. ¿Querés pedirlo igual?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    expect(await screen.findByText(/Agregaste 1 ejemplar/)).toBeTruthy();
    expect(onAdd).toHaveBeenLastCalledWith(1, true);
  });

  it("rejects invalid quantities without calling the server", () => {
    const onAdd = vi.fn();
    render(<AddToOrderFlow idPrefix="t" variant="row" onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(screen.getByRole("alert").textContent).toMatch(/mayor que cero/);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("replaces the button with the suspended notice", () => {
    render(<AddToOrderFlow idPrefix="t" suspended onAdd={vi.fn()} />);
    expect(screen.getByText(/La cuenta se encuentra suspendida o cerrada/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /agregar/i })).toBeNull();
  });
});
