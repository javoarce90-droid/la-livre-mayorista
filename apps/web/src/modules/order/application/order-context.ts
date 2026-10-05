import type { CatalogRepository } from "@/modules/catalog/application/catalog-repository";
import type { Book } from "@/modules/catalog/domain/book";
import { priceBook } from "@/modules/catalog/domain/pricing";
import type { Account } from "@/modules/account/domain/account";
import type { OrderLine } from "../domain/order";
import type { OrderRepository } from "./order-repository";

export interface OrderDeps {
  catalog: CatalogRepository;
  orders: OrderRepository;
  /** ISO date (YYYY-MM-DD) used for new lines and new orders. */
  today: string;
}

export type OrderAccount = Pick<Account, "id" | "discountPercent" | "flags">;

export function buildOrderLine(book: Book, discountPercent: number, quantity: number, date: string): OrderLine {
  const price = priceBook(book, discountPercent);
  return {
    bookCode: book.code,
    isbn: book.isbn,
    title: book.title,
    availability: book.availability,
    originalDate: date,
    unitPrice: price.listPrice,
    quantity,
    discountPercent: price.discountPercent,
    promotionPercent: price.promotionPercent,
    observation: book.availability === "out_of_stock" ? "Sin stock: se despacha cuando ingrese" : null,
  };
}
