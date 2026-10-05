import type { Book } from "../domain/book";
import { priceBook, type BookPrice } from "../domain/pricing";

/** A book as the logged-in account sees it (prices already personalized). */
export interface BookView extends Book {
  price: BookPrice;
}

export function toBookView(book: Book, discountPercent: number): BookView {
  return { ...book, price: priceBook(book, discountPercent) };
}
