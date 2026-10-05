import type { Availability, AvailabilityFilter } from "../domain/book";
import type { SearchQueryError } from "../domain/search-query";

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  immediate: "Disponible",
  on_order: "A pedido",
  out_of_stock: "Sin stock",
};

export const AVAILABILITY_FILTER_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "immediate", label: "Disponibilidad inmediata" },
  { value: "immediate_and_on_order", label: "Inmediata + no inmediata" },
];

export function searchErrorMessage(error: SearchQueryError): string {
  switch (error) {
    case "empty":
      return "Escribí qué querés buscar, empezando por la letra del criterio (por ejemplo, TCASA).";
    case "unknown_field":
      return "La primera letra tiene que ser T, A, E, I o C. Mirá la Ayuda para ver ejemplos.";
    case "missing_text":
      return "Después de la letra del criterio escribí el texto a buscar.";
    case "space_after_letter":
      return "No dejes espacio entre la letra y el texto: escribí TCASA, no T CASA.";
    case "invalid_isbn":
      return "El ISBN tiene que tener 13 dígitos, sin guiones.";
    case "missing_plus":
      return "Para combinar criterios, empezá cada uno con +, por ejemplo: +TCUENTOS +ABORGES.";
  }
}
