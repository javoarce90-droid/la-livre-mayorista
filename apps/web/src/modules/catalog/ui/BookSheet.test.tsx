// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { toBookView } from "../application/book-view";
import { makeBook } from "../domain/test-fixtures";
import { BookSheet } from "./BookSheet";
import { PVP_MODE_KEY } from "./pvp-mode";

const book = toBookView(
  makeBook({ code: "123456", title: "Casa tomada", listPrice: 1_890_000, promotion: { name: "Promo invierno", percent: 5 } }),
  10,
);

describe("BookSheet", () => {
  it("shows net price, struck list price, promo and discount detail", () => {
    render(<BookSheet book={book} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Ficha #123456" })).toBeTruthy();
    expect(screen.getByText("$ 16.159,50")).toBeTruthy();
    expect(screen.getByText("$ 18.900,00").tagName).toBe("S");
    expect(screen.getByText("Promo invierno")).toBeTruthy();
    expect(screen.getByText("Descuento 10,00% · Promoción -5%")).toBeTruthy();
  });

  it("PVP mode hides net price and discounts and is persisted", () => {
    render(<BookSheet book={book} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /ver modo pvp/i }));
    expect(screen.queryByText("$ 16.159,50")).toBeNull();
    expect(screen.queryByText("Promo invierno")).toBeNull();
    expect(screen.getByText("$ 18.900,00").tagName).toBe("SPAN");
    expect(screen.getByRole("button", { name: /ocultar modo pvp/i })).toBeTruthy();
    expect(window.localStorage.getItem(PVP_MODE_KEY)).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: /ocultar modo pvp/i }));
  });

  it("offers 'Notificarme cuando ingrese' only when not available", () => {
    const { rerender } = render(<BookSheet book={book} onClose={() => {}} />);
    expect(screen.queryByText("Notificarme cuando ingrese")).toBeNull();
    rerender(<BookSheet book={{ ...book, availability: "on_order" }} onClose={() => {}} />);
    expect(screen.getByText("Notificarme cuando ingrese")).toBeTruthy();
  });

  it("pins the add-to-order slot in the footer, outside the scrollable body", () => {
    render(<BookSheet book={book} onClose={() => {}} addSlot={<button type="button">Agregar al pedido</button>} />);
    const add = screen.getByRole("button", { name: "Agregar al pedido" });
    expect(add.closest("footer")).not.toBeNull();
  });

  it("renders no footer when opened read-only", () => {
    render(<BookSheet book={book} onClose={() => {}} />);
    expect(screen.getByRole("dialog").querySelector("footer")).toBeNull();
  });
});
