import type { Order } from "../domain/order";

/** Port: the account's current (open) order. */
export interface OrderRepository {
  getCurrent(accountId: string): Promise<Order | null>;
  save(accountId: string, order: Order): Promise<void>;
  /** Removes the open order (e.g. after dispatching it). */
  close(accountId: string): Promise<void>;
}
