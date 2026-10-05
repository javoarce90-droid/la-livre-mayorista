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
  it("shows the active criterion derived from the first letter", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Buscar libros");
    fireEvent.change(input, { target: { value: "ABORGES" } });
    expect(screen.getByText("Autor")).toBeTruthy();
    fireEvent.change(input, { target: { value: "*978" } });
    expect(screen.getByText("Código de barras")).toBeTruthy();
  });

  it("submits with Enter / Buscar", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /buscar/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("opens the help modal with the letter table", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /ayuda/i }));
    expect(screen.getByRole("dialog", { name: "¿Cómo buscar?" })).toBeTruthy();
    expect(screen.getByText("EALFAGUARA")).toBeTruthy();
  });
});
