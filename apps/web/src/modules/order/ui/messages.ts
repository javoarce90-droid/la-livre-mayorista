import type { AddBookError } from "../application/add-book-to-order";
import type { SaveOrderError } from "../application/save-order";
import type { DecreaseQuantityError } from "../domain/order";
import type { ImportErrorReason } from "../domain/order-import";

export const SUSPENDED_MESSAGE = "La cuenta se encuentra suspendida o cerrada. No es posible agregar productos al pedido.";

export function addBookErrorMessage(error: AddBookError): string {
  switch (error) {
    case "account_suspended":
      return SUSPENDED_MESSAGE;
    case "order_locked":
      return "El pedido está bloqueado mientras lo procesamos. Probá de nuevo en unos minutos.";
    case "book_not_found":
      return "No encontramos ese título en el catálogo.";
    case "invalid_quantity":
      return "La cantidad tiene que ser un número entero mayor que cero.";
  }
}

export function saveOrderErrorMessage(error: SaveOrderError): string {
  switch (error) {
    case "order_locked":
      return "El pedido está bloqueado mientras lo procesamos. No se guardaron los cambios.";
    case "book_not_found":
      return "Uno de los títulos ya no está en el catálogo. Quitalo e intentá de nuevo.";
    case "invalid_quantity":
      return "Hay cantidades inválidas en el pedido.";
    case "empty_order":
      return "No podés despachar un pedido vacío.";
  }
}

export function decreaseQuantityErrorMessage(error: DecreaseQuantityError, current: number): string {
  switch (error) {
    case "not_found":
      return "El título ya no está en el pedido.";
    case "not_integer":
      return "Ingresá un número entero.";
    case "below_minimum":
      return "La cantidad mínima es 1. Para sacarlo del pedido usá Quitar.";
    case "not_lower":
      return `Solo podés bajar la cantidad: ingresá un número menor que ${current}.`;
  }
}

export const IMPORT_ERROR_LABEL: Record<ImportErrorReason, string> = {
  invalid_isbn: "ISBN inválido (deben ser 13 dígitos)",
  invalid_quantity: "Cantidad inválida",
  not_found: "No está en el catálogo",
  not_in_stock: "Sin stock inmediato",
  not_available: "Sin stock ni reposición",
};
