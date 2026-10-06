// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddToOrderFlow } from "./AddToOrderFlow";

describe("AddToOrderFlow", () => {
  it("shows the quantity stepper right away and adds in one tap", async () => {
    const onAdd = vi.fn().mockResolvedValue({ status: "added" });
    render(<AddToOrderFlow idPrefix="t" onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar al pedido" }));
    expect(await screen.findByText(/Agregaste 1 ejemplar al pedido/)).toBeTruthy();
    expect(onAdd).toHaveBeenCalledWith(1, false);
  });

  it("steps the quantity with +/- and never goes below 1", async () => {
    const onAdd = vi.fn().mockResolvedValue({ status: "added" });
    render(<AddToOrderFlow idPrefix="t" onAdd={onAdd} />);
    const minus = screen.getByRole("button", { name: "Restar un ejemplar" });
    // aria-disabled (not disabled) keeps focus on the button when the limit is reached.
    expect(minus.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Sumar un ejemplar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sumar un ejemplar" }));
    expect((screen.getByLabelText("Cantidad") as HTMLInputElement).value).toBe("3");
    expect(minus.getAttribute("aria-disabled")).toBe("false");
    fireEvent.click(minus);
    fireEvent.click(screen.getByRole("button", { name: "Agregar al pedido" }));
    expect(await screen.findByText(/Agregaste 2 ejemplares/)).toBeTruthy();
    expect(onAdd).toHaveBeenCalledWith(2, false);
  });

  it("accepts a typed quantity with stray spaces", async () => {
    const onAdd = vi.fn().mockResolvedValue({ status: "added" });
    render(<AddToOrderFlow idPrefix="t" onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: " 3 " } });
    fireEvent.keyDown(screen.getByLabelText("Cantidad"), { key: "Enter" });
    expect(await screen.findByText(/Agregaste 3 ejemplares/)).toBeTruthy();
    expect(onAdd).toHaveBeenCalledWith(3, false);
  });

  it("asks for intervention when there is no immediate stock, then confirms", async () => {
    const onAdd = vi
      .fn()
      .mockResolvedValueOnce({ status: "needs_confirmation" })
      .mockResolvedValueOnce({ status: "added" });
    render(<AddToOrderFlow idPrefix="t" onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar al pedido" }));
    const prompt = await screen.findByRole("alertdialog", { name: "Se requiere intervención" });
    expect(prompt.textContent).toMatch(/¿Querés pedir 1 ejemplar igual\?/);
    expect(document.activeElement).toBe(prompt);
    fireEvent.click(screen.getByRole("button", { name: "Pedir igual" }));
    expect(await screen.findByText(/Agregaste 1 ejemplar/)).toBeTruthy();
    expect(onAdd).toHaveBeenLastCalledWith(1, true);
  });

  it("cancelling the intervention keeps the chosen quantity", async () => {
    const onAdd = vi.fn().mockResolvedValue({ status: "needs_confirmation" });
    render(<AddToOrderFlow idPrefix="t" onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar al pedido" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect((screen.getByLabelText("Cantidad") as HTMLInputElement).value).toBe("4");
  });

  it("rejects invalid quantities without calling the server and clears the error once fixed", () => {
    const onAdd = vi.fn();
    render(<AddToOrderFlow idPrefix="t" variant="row" onAdd={onAdd} />);
    const input = screen.getByLabelText("Cantidad");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/mayor que cero/);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "2" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("'Agregar más' resets to a fresh quantity of 1", async () => {
    const onAdd = vi.fn().mockResolvedValue({ status: "added" });
    render(<AddToOrderFlow idPrefix="t" onAdd={onAdd} />);
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar al pedido" }));
    fireEvent.click(await screen.findByRole("button", { name: "Agregar más" }));
    expect((screen.getByLabelText("Cantidad") as HTMLInputElement).value).toBe("1");
  });

  it("replaces the controls with the suspended notice", () => {
    render(<AddToOrderFlow idPrefix="t" suspended onAdd={vi.fn()} />);
    expect(screen.getByText(/La cuenta se encuentra suspendida o cerrada/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /agregar/i })).toBeNull();
  });
});
