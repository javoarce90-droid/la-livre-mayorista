// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { nextSort, type SortState } from "@/shared/lib/sort";
import { removeLine, setLineQuantity, type OrderLine } from "../domain/order";
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

/** Ceiling = quantity loaded at start, like the container does. */
function Harness({ editing = false, onRemove = vi.fn() }: { editing?: boolean; onRemove?: (line: OrderLine) => void }) {
  const [rows, setRows] = useState<OrderLine[]>(lines);
  const [sort, setSort] = useState<SortState<OrderSortKey> | null>(null);
  const ceilings: Record<string, number> = { "1": 1, "2": 3 };
  return (
    <OrderLinesTable
      lines={rows}
      editing={editing}
      sort={sort}
      onSortChange={(key) => setSort((current) => nextSort(current, key))}
      maxQuantity={(line) => ceilings[line.bookCode]}
      onQuantityChange={(line, quantity) => {
        const result = setLineQuantity(rows, line.bookCode, quantity, ceilings[line.bookCode]);
        if (!result.ok) return result.error;
        setRows(result.value);
        return null;
      }}
      onRemove={(line) => {
        onRemove(line);
        setRows((current) => removeLine(current, line.bookCode));
      }}
      onOpenSheet={() => {}}
    />
  );
}

const table = () => screen.getByRole("table");

const titlesInTable = () =>
  within(table())
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector("td")?.textContent);

describe("OrderLinesTable", () => {
  it("sorts by clicking headers and toggles direction", () => {
    render(<Harness />);
    expect(titlesInTable()).toEqual(["Rayuela", "Bestiario"]);
    fireEvent.click(within(table()).getByRole("button", { name: /título/i }));
    expect(titlesInTable()).toEqual(["Bestiario", "Rayuela"]);
    fireEvent.click(within(table()).getByRole("button", { name: /título/i }));
    expect(titlesInTable()).toEqual(["Rayuela", "Bestiario"]);
  });

  it("shows reference columns only in consulta mode", () => {
    const { unmount } = render(<Harness />);
    expect(within(table()).queryByText("Observación")).toBeTruthy();
    expect(within(table()).queryByText("SKU")).toBeTruthy();
    unmount();
    render(<Harness editing />);
    expect(within(table()).queryByText("Observación")).toBeNull();
    expect(within(table()).queryByText("SKU")).toBeNull();
  });

  it("changes quantities inline with the stepper, within 1 and the loaded quantity", () => {
    render(<Harness editing />);
    const minus = within(table()).getByRole("button", { name: "Restar 1 a Bestiario" });
    const plus = within(table()).getByRole("button", { name: "Sumar 1 a Bestiario" });
    const field = within(table()).getByLabelText("Cantidad de Bestiario") as HTMLInputElement;

    expect(plus.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(minus);
    expect(field.value).toBe("2");
    fireEvent.click(plus);
    expect(field.value).toBe("3");

    expect(within(table()).getByRole("button", { name: "Restar 1 a Rayuela" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("applies typed quantities on Enter, accepting spaces", () => {
    render(<Harness editing />);
    const field = within(table()).getByLabelText("Cantidad de Bestiario") as HTMLInputElement;
    fireEvent.change(field, { target: { value: " 2 " } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(field.value).toBe("2");
    expect(within(table()).queryByRole("alert")).toBeNull();
  });

  it("explains an out-of-range quantity next to the field and keeps what was typed", () => {
    render(<Harness editing />);
    const field = within(table()).getByLabelText("Cantidad de Bestiario") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "9" } });
    fireEvent.blur(field);
    const alert = within(table()).getByRole("alert");
    expect(alert.textContent).toMatch(/hasta 3/);
    expect(field.getAttribute("aria-describedby")).toBe(alert.id);
    expect(field.value).toBe("9");
  });

  it("removes a line right away, without a confirmation step", () => {
    const onRemove = vi.fn();
    render(<Harness editing onRemove={onRemove} />);
    fireEvent.click(within(table()).getByRole("button", { name: "Quitar Rayuela" }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ bookCode: "1" }));
    expect(titlesInTable()).toEqual(["Bestiario"]);
  });
});
