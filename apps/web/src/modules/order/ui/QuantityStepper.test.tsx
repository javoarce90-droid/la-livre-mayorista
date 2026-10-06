// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./QuantityStepper";

function setup(quantity = 2, maximum = 4) {
  const onChange = vi.fn().mockReturnValue(null);
  render(<QuantityStepper title="Rayuela" quantity={quantity} maximum={maximum} onChange={onChange} />);
  return { onChange, input: screen.getByLabelText("Cantidad de Rayuela") as HTMLInputElement };
}

describe("QuantityStepper", () => {
  it("reaches 44×44 on phones and compacts from sm up (responsive table = touch surface)", () => {
    setup();
    for (const name of ["Restar 1 a Rayuela", "Sumar 1 a Rayuela"]) {
      const classes = screen.getByRole("button", { name }).className;
      expect(classes).toContain("size-11");
      expect(classes).toContain("sm:size-9");
    }
  });

  it("uses 16 px input text on phones so iOS does not zoom on focus", () => {
    const { input } = setup();
    expect(input.className).toContain("text-base");
    expect(input.inputMode).toBe("numeric");
  });

  it("applies typed quantities liberally on Enter (thousands dots, spaces)", () => {
    const { onChange, input } = setup(2, 2000);
    fireEvent.change(input, { target: { value: " 1.000 " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(1000);
  });

  it("keeps what was typed and explains the error when it is not a number", () => {
    const { onChange, input } = setup();
    fireEvent.change(input, { target: { value: "dos" } });
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(input.value).toBe("dos");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("keeps the limit buttons focusable (aria-disabled) at the minimum", () => {
    const { onChange } = setup(1);
    const minus = screen.getByRole("button", { name: "Restar 1 a Rayuela" });
    expect(minus.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(minus);
    expect(onChange).not.toHaveBeenCalled();
  });
});
