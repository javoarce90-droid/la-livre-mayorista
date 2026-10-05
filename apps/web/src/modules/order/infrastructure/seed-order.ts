import { SEED_BOOKS } from "@/modules/catalog/infrastructure/seed-books";
import { isoDate } from "@/shared/lib/dates";
import type { Order } from "../domain/order";
import { buildOrderLine } from "../application/order-context";

const SEED_LINES: [title: string, quantity: number, daysAgo: number][] = [
  ["Casa tomada y otros cuentos", 4, 0],
  ["La casa de los espíritus", 2, 1],
  ["Rayuela", 3, 2],
  ["Ficciones", 5, 2],
  ["El principito", 6, 3],
  ["Nuestra parte de noche", 1, 3],
];

function isoDaysAgo(today: Date, days: number): string {
  return isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days));
}

/** Demo open order so the dashboard and /pedido have something to show. */
export function createSeedOrder(today: Date, discountPercent: number): Order {
  const lines = SEED_LINES.flatMap(([title, quantity, daysAgo]) => {
    const book = SEED_BOOKS.find((candidate) => candidate.title === title);
    return book ? [buildOrderLine(book, discountPercent, quantity, isoDaysAgo(today, daysAgo))] : [];
  });
  return { id: "ord-demo", createdAt: isoDaysAgo(today, 3), lines };
}
