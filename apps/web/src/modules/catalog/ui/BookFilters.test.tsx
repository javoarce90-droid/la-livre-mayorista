// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { NO_FILTERS, type SearchFilters } from "../domain/search-filters";
import { ActiveFilterChips, BookFilters, type FilterChange } from "./BookFilters";

import type { CatalogFacets } from "../application/catalog-repository";

const facets: CatalogFacets = {
  publishers: ["Alfaguara", "Anagrama"],
  subjects: ["Cuentos", "Narrativa"],
  availabilities: ["immediate", "on_order", "out_of_stock"],
  hasPromotions: true,
};

/** What the La Livre API reports: no subjects, everything available, no promotions. */
const realCatalogFacets: CatalogFacets = {
  publishers: ["Anagrama", "Paidós"],
  subjects: [],
  availabilities: ["immediate"],
  hasPromotions: false,
};

function Harness({
  onChange,
  initial = NO_FILTERS,
  facetValues = facets,
}: {
  onChange: FilterChange;
  initial?: SearchFilters;
  facetValues?: CatalogFacets;
}) {
  const [value, setValue] = useState(initial);
  const change: FilterChange = (next, options) => {
    setValue(next);
    onChange(next, options);
  };
  return (
    <>
      <BookFilters value={value} onChange={change} facets={facetValues} />
      <ActiveFilterChips value={value} onChange={change} />
    </>
  );
}

describe("BookFilters", () => {
  it("applies typed text after a pause and discrete choices immediately", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Autor"), { target: { value: "borges" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ author: "borges" }), { immediate: false });

    fireEvent.change(screen.getByLabelText("Materia"), { target: { value: "Cuentos" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ author: "borges", subject: "Cuentos" }), { immediate: true });

    fireEvent.click(screen.getByRole("radio", { name: "Solo disponibles" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ availability: "immediate" }), { immediate: true });

    fireEvent.click(screen.getByLabelText("Solo con promoción"));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ promotionOnly: true }), { immediate: true });
  });

  it("applies a publisher picked from the suggestions immediately", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Editorial"), { target: { value: "Anag" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.anything(), { immediate: false });
    fireEvent.change(screen.getByLabelText("Editorial"), { target: { value: "Anagrama" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ publisher: "Anagrama" }), { immediate: true });
  });

  it("hides filters with nothing to choose from (real catalog data)", () => {
    render(<Harness onChange={vi.fn()} facetValues={realCatalogFacets} />);
    expect(screen.getByLabelText("Autor")).toBeTruthy();
    expect(screen.getByLabelText("Editorial")).toBeTruthy();
    expect(screen.queryByLabelText("Materia")).toBeNull();
    expect(screen.queryByLabelText("Solo con promoción")).toBeNull();
    expect(screen.queryByRole("radio", { name: "Solo disponibles" })).toBeNull();
  });

  it("shows the active filter count on the mobile toggle", () => {
    render(<Harness onChange={vi.fn()} initial={{ ...NO_FILTERS, author: "borges", promotionOnly: true }} />);
    expect(screen.getByRole("button", { name: "Filtros (2)" }).getAttribute("aria-expanded")).toBe("false");
  });
});

describe("ActiveFilterChips", () => {
  it("removes one filter per chip and clears all at once", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial={{ ...NO_FILTERS, author: "borges", subject: "Cuentos" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Quitar filtro Autor: borges" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...NO_FILTERS, subject: "Cuentos" }, { immediate: true });
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).toBeNull();
  });

  it("offers Limpiar filtros when more than one filter is active", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial={{ ...NO_FILTERS, author: "borges", subject: "Cuentos" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onChange).toHaveBeenLastCalledWith(NO_FILTERS, { immediate: true });
    expect(screen.queryByRole("group", { name: "Filtros activos" })).toBeNull();
  });
});
