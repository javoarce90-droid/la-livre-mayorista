import { describe, expect, it } from "vitest";
import { lastTwelveMonths } from "./monthly-sales";

describe("lastTwelveMonths", () => {
  const now = new Date(2026, 9, 5);

  it("returns twelve months ending in the current month, oldest first", () => {
    const months = lastTwelveMonths([], now);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ month: "2025-11", label: "nov", amount: 0 });
    expect(months[11]).toEqual({ month: "2026-10", label: "oct", amount: 0 });
  });

  it("fills known amounts and ignores months outside the window", () => {
    const months = lastTwelveMonths(
      [
        { month: "2026-09", amount: 500 },
        { month: "2025-10", amount: 999 },
        { month: "2026-01", amount: 300 },
      ],
      now,
    );
    expect(months.find((m) => m.month === "2026-09")?.amount).toBe(500);
    expect(months.find((m) => m.month === "2026-01")).toEqual({ month: "2026-01", label: "ene", amount: 300 });
    expect(months.some((m) => m.month === "2025-10")).toBe(false);
  });
});
