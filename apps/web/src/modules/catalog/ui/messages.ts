import type { Availability, AvailabilityFilter } from "../domain/book";
import { fieldLabel, type SearchQuery, type SearchQueryError } from "../domain/search-query";

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  immediate: "Disponible",
  on_order: "A pedido",
  out_of_stock: "Sin stock",
};

/** Same vocabulary as the status pills in the results (Disponible / A pedido). */
export const AVAILABILITY_FILTER_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "immediate", label: "Solo disponibles" },
  { value: "immediate_and_on_order", label: "Disponibles y a pedido" },
];

export function availabilityFilterLabel(filter: AvailabilityFilter): string {
  return AVAILABILITY_FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? filter;
}

export function searchErrorMessage(error: SearchQueryError): string {
  switch (error) {
    case "empty":
      return "Escribí un título, autor, editorial o ISBN para buscar.";
    case "unknown_field":
      return "Después del + va la letra del campo: T, A, E, I o C (por ejemplo, +TCASA). O escribí el texto sin +.";
    case "missing_text":
      return "Después de la letra del campo escribí el texto, por ejemplo: +ABORGES.";
    case "space_after_letter":
      return "No dejes espacio entre la letra y el texto: escribí +TCASA, no +T CASA.";
    case "invalid_isbn":
      return "El ISBN tiene que tener 13 dígitos. Podés escribirlo con o sin guiones.";
    case "missing_plus":
      return "Para combinar atajos, empezá cada uno con +, por ejemplo: +TCUENTOS +ABORGES.";
  }
}

/** Explains why the results do not match the literal text (legacy shortcut fallback). */
export function interpretationNotice(query: SearchQuery): string | null {
  if (query.kind !== "position") return null;
  const label = fieldLabel(query.field);
  const how =
    query.field === "title" || query.field === "author"
      ? `desde “${query.text}” en orden alfabético`
      : query.field === "publisher"
        ? `que empieza con “${query.text}”`
        : `“${query.text}”`;
  return `No encontramos ese texto, así que lo tomamos como atajo: ${label} ${how}.`;
}
