// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { SearchBox } from "./SearchBox";

function Harness({ onSubmit = () => {} }: { onSubmit?: () => void }) {
  const [value, setValue] = useState("");
  return <SearchBox value={value} onChange={setValue} onSubmit={onSubmit} />;
}

describe("SearchBox", () => {
  it("invites plain text instead of a letter prefix", () => {
    render(<Harness />);
    expect(screen.getByPlaceholderText("Título, autor, editorial o ISBN…")).toBeTruthy();
  });

  it("shows the criterion chip only for unambiguous input", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Buscar libros");
    fireEvent.change(input, { target: { value: "Antología" } });
    expect(screen.queryByText("Autor")).toBeNull();
    fireEvent.change(input, { target: { value: "978-950-307-406-0" } });
    expect(screen.getByText("ISBN")).toBeTruthy();
    fireEvent.change(input, { target: { value: "*978" } });
    expect(screen.getByText("Código de barras")).toBeTruthy();
    fireEvent.change(input, { target: { value: "+ABORGES" } });
    expect(screen.getByText("Autor")).toBeTruthy();
  });

  it("submits with Enter / Buscar", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("opens the help modal, with letter shortcuts as an optional section", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /ayuda/i }));
    expect(screen.getByRole("dialog", { name: "¿Cómo buscar?" })).toBeTruthy();
    expect(screen.getByText("Escribí lo que sepas")).toBeTruthy();
    expect(screen.getByText("Atajos con letra (opcional)")).toBeTruthy();
    expect(screen.getByText("+EALFAGUARA")).toBeTruthy();
  });

  it("lets a screen with its own primary action demote Buscar (one dominant action per view)", () => {
    render(<SearchBox value="" onChange={() => {}} onSubmit={() => {}} submitVariant="secondary" />);
    const submit = screen.getByRole("button", { name: "Buscar" });
    expect(submit.className).not.toContain("bg-brand-600");
    expect(submit.className).toContain("border-line");
  });

  it("uses 16 px text in the field on phones (no iOS zoom on focus)", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Buscar libros").className).toContain("text-base");
  });
});
