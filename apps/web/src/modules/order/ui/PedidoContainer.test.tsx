// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { OrderLine } from "../domain/order";
import { PedidoContainer, type PedidoAccount } from "./PedidoContainer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({ saveOrderAction: vi.fn() }));
vi.mock("@/modules/catalog/ui/actions", () => ({ searchBooksAction: vi.fn() }));

const account: PedidoAccount = {
  bookstoreName: "Librería Sur",
  branch: "Centro",
  deposit: "Depósito 1",
  rubro: "Libros",
  email: "sur@example.com",
  zone: "Interior",
  discountPercent: 0,
  suspended: false,
  orderLocked: false,
};

const line: OrderLine = {
  bookCode: "1",
  isbn: "9780000000001",
  title: "Rayuela",
  quantity: 2,
  availability: "immediate",
  originalDate: "2026-08-18",
  unitPrice: 1_000_000,
  discountPercent: 0,
  promotionPercent: 0,
  observation: null,
};

const MOBILE_HIDDEN = "max-md:hidden";

describe("PedidoContainer edit-mode notices on phones", () => {
  it("merges the stock-reservation note into the zone notice instead of a second callout", () => {
    render(<PedidoContainer account={account} order={{ createdAt: "2026-08-18", lines: [line] }} books={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Modificar" }));

    const notices = screen.getAllByRole("status");
    const stockNotice = notices.find((notice) => notice.textContent?.includes("El stock se reserva recién cuando guardás"));
    const zoneNotice = notices.find((notice) => notice.textContent?.includes("Guardar no es despachar"));

    expect(stockNotice?.classList.contains(MOBILE_HIDDEN)).toBe(true);
    expect(zoneNotice?.classList.contains(MOBILE_HIDDEN)).toBe(false);
    expect(zoneNotice?.textContent).toContain("El stock se reserva al guardar");
  });
});
