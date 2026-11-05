/** Stock semaphore: Disponible / A pedido / Sin stock. */
export type Availability = "immediate" | "on_order" | "out_of_stock";

/** Results filter: Todos / Disponibilidad inmediata / Inmediata + no inmediata. */
export type AvailabilityFilter = "all" | "immediate" | "immediate_and_on_order";

export interface Promotion {
  name: string;
  /** Extra discount on top of the account discount, e.g. 5 for -5%. */
  percent: number;
}

export interface Book {
  /** Internal code (SKU). Books from the La Livre API use the ISBN. */
  code: string;
  /** ISBN-13 / EAN, digits only. */
  isbn: string;
  title: string;
  /** "Last, First" */
  author: string;
  publisher: string;
  /** PVP (list price) in cents. */
  listPrice: number;
  /** ISO date since which the list price applies (the supplier feed date for real books). */
  priceDate: string;
  /** Recommended age such as "+12", or null when the publisher does not report it. */
  recommendedAge: string | null;
  /** Real books are always "immediate": the API only lists immediately available ones. */
  availability: Availability;
  /** Null when the source does not report it (the real catalog has no subjects). */
  subject: string | null;
  year: number | null;
  language: string | null;
  pages: number | null;
  review: string | null;
  promotion: Promotion | null;
}
