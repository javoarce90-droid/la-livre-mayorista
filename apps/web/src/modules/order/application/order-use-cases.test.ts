import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryCatalogRepository } from "@/modules/catalog/infrastructure/in-memory-catalog-repository";
import { makeBook } from "@/modules/catalog/domain/test-fixtures";
import type { AccountFlags } from "@/modules/account/domain/account";
import { InMemoryOrderRepository } from "../infrastructure/in-memory-order-repository";
import { addBookToOrder } from "./add-book-to-order";
import { getCurrentOrder } from "./get-current-order";
import { previewImport } from "./preview-import";
import { saveOrder } from "./save-order";

const available = makeBook({ code: "1", isbn: "9780000000001", title: "Rayuela", availability: "immediate", listPrice: 1_000_000 });
const onOrder = makeBook({ code: "2", isbn: "9780000000002", title: "Bestiario", availability: "on_order" });
const noStock = makeBook({ code: "3", isbn: "9780000000003", title: "Facundo", availability: "out_of_stock" });

const flags: AccountFlags = { hasConsignment: false, hasPromotions: false, suspended: false, orderLocked: false };
const account = { id: "acc-1", discountPercent: 10, flags };
const today = "2026-10-05";

let deps: { catalog: InMemoryCatalogRepository; orders: InMemoryOrderRepository; today: string };

beforeEach(() => {
  deps = {
    catalog: new InMemoryCatalogRepository([available, onOrder, noStock]),
    orders: new InMemoryOrderRepository(),
    today,
  };
});

describe("addBookToOrder", () => {
  it("opens an order and adds an available book", async () => {
    const result = await addBookToOrder(deps, { account, bookCode: "1", quantity: 2, confirmUnavailable: false });
    expect(result).toEqual({ status: "added" });
    const order = await getCurrentOrder(deps, account.id);
    expect(order?.lines).toEqual([
      expect.objectContaining({ bookCode: "1", quantity: 2, unitPrice: 1_000_000, discountPercent: 10, originalDate: today }),
    ]);
  });

  it("asks for confirmation when the book is not immediately available", async () => {
    const result = await addBookToOrder(deps, { account, bookCode: "2", quantity: 1, confirmUnavailable: false });
    expect(result).toEqual({ status: "needs_confirmation" });
    expect(await getCurrentOrder(deps, account.id)).toBeNull();
  });

  it("adds an unavailable book once confirmed", async () => {
    const result = await addBookToOrder(deps, { account, bookCode: "3", quantity: 1, confirmUnavailable: true });
    expect(result).toEqual({ status: "added" });
  });

  it("merges quantities for the same book", async () => {
    await addBookToOrder(deps, { account, bookCode: "1", quantity: 2, confirmUnavailable: false });
    await addBookToOrder(deps, { account, bookCode: "1", quantity: 3, confirmUnavailable: false });
    expect((await getCurrentOrder(deps, account.id))?.lines[0].quantity).toBe(5);
  });

  it.each([
    [{ ...account, flags: { ...flags, suspended: true } }, "1", 1, "account_suspended"],
    [{ ...account, flags: { ...flags, orderLocked: true } }, "1", 1, "order_locked"],
    [account, "999", 1, "book_not_found"],
    [account, "1", 0, "invalid_quantity"],
  ] as const)("rejects with %#", async (acc, bookCode, quantity, error) => {
    expect(await addBookToOrder(deps, { account: acc, bookCode, quantity, confirmUnavailable: true })).toEqual({
      status: "error",
      error,
    });
  });
});

describe("saveOrder", () => {
  it("replaces the order lines, keeping the original date of existing lines", async () => {
    await addBookToOrder({ ...deps, today: "2026-09-01" }, { account, bookCode: "1", quantity: 5, confirmUnavailable: false });
    const result = await saveOrder(deps, {
      account,
      lines: [
        { bookCode: "1", quantity: 2 },
        { bookCode: "2", quantity: 1 },
      ],
      dispatch: false,
    });
    expect(result).toEqual({ status: "saved" });
    const order = await getCurrentOrder(deps, account.id);
    expect(order?.lines.map((l) => [l.bookCode, l.quantity, l.originalDate])).toEqual([
      ["1", 2, "2026-09-01"],
      ["2", 1, today],
    ]);
  });

  it("closes the order when dispatching", async () => {
    await addBookToOrder(deps, { account, bookCode: "1", quantity: 1, confirmUnavailable: false });
    expect(await saveOrder(deps, { account, lines: [{ bookCode: "1", quantity: 1 }], dispatch: true })).toEqual({
      status: "dispatched",
    });
    expect(await getCurrentOrder(deps, account.id)).toBeNull();
  });

  it("rejects saving a locked order", async () => {
    const locked = { ...account, flags: { ...flags, orderLocked: true } };
    expect(await saveOrder(deps, { account: locked, lines: [], dispatch: false })).toEqual({
      status: "error",
      error: "order_locked",
    });
  });

  it("rejects unknown books and invalid quantities", async () => {
    expect(await saveOrder(deps, { account, lines: [{ bookCode: "999", quantity: 1 }], dispatch: false })).toEqual({
      status: "error",
      error: "book_not_found",
    });
    expect(await saveOrder(deps, { account, lines: [{ bookCode: "1", quantity: -2 }], dispatch: false })).toEqual({
      status: "error",
      error: "invalid_quantity",
    });
  });

  it("rejects dispatching an empty order", async () => {
    expect(await saveOrder(deps, { account, lines: [], dispatch: true })).toEqual({
      status: "error",
      error: "empty_order",
    });
  });
});

describe("previewImport", () => {
  it("returns priced lines to add and per-row errors", async () => {
    const csv = ["9780000000001,2", "9780000000003,1", "9789999999999,1", "123,1"].join("\n");
    const result = await previewImport(deps, { account, csv, criterion: "in_stock" });
    expect(result.lines).toEqual([expect.objectContaining({ bookCode: "1", quantity: 2, discountPercent: 10 })]);
    expect(result.errors.map((e) => [e.row, e.reason])).toEqual([
      [2, "not_in_stock"],
      [3, "not_found"],
      [4, "invalid_isbn"],
    ]);
  });
});
