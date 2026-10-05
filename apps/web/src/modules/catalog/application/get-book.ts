import { toBookView, type BookView } from "./book-view";
import type { CatalogRepository } from "./catalog-repository";

export async function getBook(
  catalog: CatalogRepository,
  { code, discountPercent }: { code: string; discountPercent: number },
): Promise<BookView | null> {
  const book = await catalog.findByCode(code);
  return book ? toBookView(book, discountPercent) : null;
}
