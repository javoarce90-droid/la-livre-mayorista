import type { AccountRepository } from "../application/account-repository";
import type { Account, AccountFlags, DeliveryZone, MonthlySale } from "../domain/account";

export const DEMO_ACCOUNT_ID = "acc-demo";

export interface MockAccountOptions {
  now?: Date;
  zone?: DeliveryZone;
  flags?: Partial<AccountFlags>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function salesUntil(now: Date): MonthlySale[] {
  const amounts = [612_300, 845_900, 1_032_400, 701_200, 1_188_000, 934_500, 1_301_700, 1_045_800, 1_216_300, 862_100, 1_098_400, 1_402_600];
  return amounts.map((pesos, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return { month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, amount: pesos * 100 };
  });
}

/** Mock adapter. Flags can be tweaked to preview every portal state. */
export function createMockAccountRepository(options: MockAccountOptions = {}): AccountRepository {
  const now = () => options.now ?? new Date();
  const account: Account = {
    id: DEMO_ACCOUNT_ID,
    bookstoreName: "Librería del Puerto",
    branch: "Sucursal Centro",
    deposit: "Depósito Central",
    rubro: "Librería",
    email: "compras@libreriadelpuerto.com.ar",
    zone: options.zone ?? "Interior",
    discountPercent: 10,
    flags: {
      hasConsignment: true,
      hasPromotions: true,
      suspended: false,
      orderLocked: false,
      ...options.flags,
    },
  };

  return {
    async getAccount() {
      return account;
    },
    async getStatement() {
      return { balance: 9_641_050, overdue: 1_280_000 };
    },
    async getActivity() {
      const current = now();
      return {
        lastOrderAt: new Date(current.getTime() - 3 * DAY_MS).toISOString(),
        lastInvoice: { number: "A-0004-00012876", amount: 7_211_000, url: "#" },
        lastShipment: {
          date: isoDay(new Date(current.getTime() - 5 * DAY_MS)),
          trackingUrl: "https://www.correoargentino.com.ar/formularios/e-commerce",
        },
      };
    },
    async getConsignment() {
      return { coverValue: 24_590_000, copies: 418 };
    },
    async getMonthlySales() {
      return salesUntil(now());
    },
    async getUnreadNotifications() {
      return 3;
    },
  };
}
