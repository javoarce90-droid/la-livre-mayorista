// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useState } from "react";
import { nextSort, type SortState } from "@/shared/lib/sort";
import type { OrderLine } from "../domain/order";
import { OrderLinesTable, type OrderSortKey } from "./OrderLinesTable";

const base: Omit<OrderLine, "bookCode" | "title" | "quantity"> = {
  isbn: "9780000000001",
  availability: "immediate",
  originalDate: "2026-08-18",
  unitPrice: 1_000_000,
  discountPercent: 10,
  promotionPercent: 0,
  observation: null,
};

const lines: OrderLine[] = [
  { ...base, bookCode: "1", title: "Rayuela", quantity: 1 },
  { ...base, bookCode: "2", title: "Bestiario", quantity: 3, availability: "out_of_stock" },
];

function Harness({ editing = false }: { editing?: boolean }) {
  const [sort, setSort] = useState<SortState<OrderSortKey> | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <OrderLinesTable
      lines={lines}
      editing={editing}
      sort={sort}
      onSortChange={(key) => setSort((current) => nextSort(current, key))}
      confirmingRemoval={confirming}
      onAskRemove={setConfirming}
      onRemove={() => {}}
      onDecrease={() => {}}
      onOpenSheet={() => {}}
    />
  );
}

const titlesInTable = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector("td")?.textContent);

describe("OrderLinesTable", () => {
  it("sorts by clicking headers and toggles direction", () => {
    render(<Harness />);
    expect(titlesInTable()).toEqual(["Rayuela", "Bestiario"]);
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: /título/i }));
    expect(titlesInTable()).toEqual(["Bestiario", "Rayuela"]);
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: /título/i }));
    expect(titlesInTable()).toEqual(["Rayuela", "Bestiario"]);
  });

  it("shows Observación only in consulta mode", () => {
    const { unmount } = render(<Harness />);
    expect(within(screen.getByRole("table")).queryByText("Observación")).toBeTruthy();
    unmount();
    render(<Harness editing />);
    expect(within(screen.getByRole("table")).queryByText("Observación")).toBeNull();
  });

  it("offers decrease only when quantity > 1 and confirms removal inline", () => {
    render(<Harness editing />);
    const table = screen.getByRole("table");
    expect(within(table).queryByRole("button", { name: "Modificar cantidad de Rayuela" })).toBeNull();
    expect(within(table).getByRole("button", { name: "Modificar cantidad de Bestiario" })).toBeTruthy();
    fireEvent.click(within(table).getAllByRole("button", { name: /quitar/i })[0]);
    expect(within(table).getByText("¿Quitar este elemento del pedido?")).toBeTruthy();
  });
});
