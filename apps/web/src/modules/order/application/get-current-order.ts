import type { Order } from "../domain/order";
import type { OrderRepository } from "./order-repository";

export function getCurrentOrder(deps: { orders: OrderRepository }, accountId: string): Promise<Order | null> {
  return deps.orders.getCurrent(accountId);
}
