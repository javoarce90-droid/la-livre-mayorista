import { describe, expect, it } from "vitest";
import { nextSort, sortRows } from "./sort";

const rows = [
  { title: "Rayuela", total: 300 },
  { title: "Ábaco", total: 100 },
  { title: "casa tomada", total: 200 },
];

describe("sortRows", () => {
  it("sorts strings ascending ignoring case and accents", () => {
    const sorted = sortRows(rows, { key: "title", direction: "asc" }, (r, k) => r[k as "title"]);
    expect(sorted.map((r) => r.title)).toEqual(["Ábaco", "casa tomada", "Rayuela"]);
  });

  it("sorts numbers descending", () => {
    const sorted = sortRows(rows, { key: "total", direction: "desc" }, (r, k) => r[k as "total"]);
    expect(sorted.map((r) => r.total)).toEqual([300, 200, 100]);
  });

  it("does not mutate the input and returns a copy when unsorted", () => {
    const sorted = sortRows(rows, null, () => 0);
    expect(sorted).toEqual(rows);
    expect(sorted).not.toBe(rows);
  });
});

describe("nextSort", () => {
  it("starts ascending on a new column", () => {
    expect(nextSort(null, "title")).toEqual({ key: "title", direction: "asc" });
    expect(nextSort({ key: "total", direction: "desc" }, "title")).toEqual({ key: "title", direction: "asc" });
  });

  it("toggles direction on the same column", () => {
    expect(nextSort({ key: "title", direction: "asc" }, "title")).toEqual({ key: "title", direction: "desc" });
    expect(nextSort({ key: "title", direction: "desc" }, "title")).toEqual({ key: "title", direction: "asc" });
  });
});
