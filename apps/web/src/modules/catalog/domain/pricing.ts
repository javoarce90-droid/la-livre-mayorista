import type { Book } from "./book";

export interface BookPrice {
  /** PVP in cents. */
  listPrice: number;
  /** What the bookstore pays, in cents. */
  netPrice: number;
  discountPercent: number;
  promotionPercent: number;
}

/** Chains percentage discounts and rounds to whole cents. */
export function applyDiscounts(amount: number, ...percents: number[]): number {
  return Math.round(percents.reduce((value, percent) => value * (1 - percent / 100), amount));
}

/** Net price = list price − account discount − promotion (chained). */
export function priceBook(book: Pick<Book, "listPrice" | "promotion">, accountDiscountPercent: number): BookPrice {
  const promotionPercent = book.promotion?.percent ?? 0;
  return {
    listPrice: book.listPrice,
    netPrice: applyDiscounts(book.listPrice, accountDiscountPercent, promotionPercent),
    discountPercent: accountDiscountPercent,
    promotionPercent,
  };
}
