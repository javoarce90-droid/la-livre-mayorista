import { describe, expect, it } from "vitest";
import {
  formatBonus,
  formatDate,
  formatMoney,
  formatPercent,
  formatRelativeDays,
} from "./format";

describe("formatMoney", () => {
  it("formats cents as es-AR currency with thousands dots and decimal comma", () => {
    expect(formatMoney(18_432_000)).toBe("$ 184.320,00");
  });

  it("groups four-digit amounts", () => {
    expect(formatMoney(1_890_000)).toBe("$ 18.900,00");
    expect(formatMoney(123_450)).toBe("$ 1.234,50");
  });

  it("formats small and zero amounts", () => {
    expect(formatMoney(0)).toBe("$ 0,00");
    expect(formatMoney(5)).toBe("$ 0,05");
  });

  it("formats millions", () => {
    expect(formatMoney(123_456_789_01)).toBe("$ 123.456.789,01");
  });

  it("puts the sign before the currency symbol for negatives", () => {
    expect(formatMoney(-100_000)).toBe("-$ 1.000,00");
  });

  it("rounds fractional cents", () => {
    expect(formatMoney(100.6)).toBe("$ 1,01");
  });
});

describe("formatPercent", () => {
  it("uses two decimals and a comma", () => {
    expect(formatPercent(10)).toBe("10,00%");
    expect(formatPercent(12.5)).toBe("12,50%");
  });
});

describe("formatBonus", () => {
  it("shows the account discount alone", () => {
    expect(formatBonus(10, 0)).toBe("10 %");
  });

  it("appends the promotion when present", () => {
    expect(formatBonus(10, 5)).toBe("10 % +5 %");
  });

  it("shows only the promotion when there is no account discount", () => {
    expect(formatBonus(0, 15)).toBe("+15 %");
  });

  it("shows a dash when there is nothing", () => {
    expect(formatBonus(0, 0)).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats ISO dates as dd/mm/yyyy", () => {
    expect(formatDate("2026-08-14")).toBe("14/08/2026");
  });

  it("ignores the time part", () => {
    expect(formatDate("2026-01-05T23:10:00.000Z")).toBe("05/01/2026");
  });
});

describe("formatRelativeDays", () => {
  const now = new Date(2026, 9, 5, 10, 0);

  it("says Hoy for the same calendar day", () => {
    expect(formatRelativeDays(new Date(2026, 9, 5, 0, 1), now)).toBe("Hoy");
  });

  it("says Ayer for the previous calendar day even if less than 24h ago", () => {
    expect(formatRelativeDays(new Date(2026, 9, 4, 23, 59), now)).toBe("Ayer");
  });

  it("says Hace N días for older dates", () => {
    expect(formatRelativeDays(new Date(2026, 9, 2, 12, 0), now)).toBe("Hace 3 días");
  });

  it("crosses month boundaries", () => {
    expect(formatRelativeDays(new Date(2026, 8, 30), now)).toBe("Hace 5 días");
  });

  it("says Sin pedidos when there is no date", () => {
    expect(formatRelativeDays(null, now)).toBe("Sin pedidos");
  });

  it("accepts ISO strings", () => {
    expect(formatRelativeDays("2026-10-04T12:00:00", now)).toBe("Ayer");
  });
});
