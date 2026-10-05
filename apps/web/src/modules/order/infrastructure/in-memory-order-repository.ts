import type { OrderRepository } from "../application/order-repository";
import type { Order } from "../domain/order";

/** Process-local store keyed by account. Data resets when the server restarts. */
export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  constructor(initial: Record<string, Order> = {}) {
    Object.entries(initial).forEach(([accountId, order]) => this.orders.set(accountId, structuredClone(order)));
  }

  async getCurrent(accountId: string): Promise<Order | null> {
    const order = this.orders.get(accountId);
    return order ? structuredClone(order) : null;
  }

  async save(accountId: string, order: Order): Promise<void> {
    this.orders.set(accountId, structuredClone(order));
  }

  async close(accountId: string): Promise<void> {
    this.orders.delete(accountId);
  }
}
