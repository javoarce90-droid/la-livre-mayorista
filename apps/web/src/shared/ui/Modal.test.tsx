// @vitest-environment jsdom
import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

function Harness({ withInitialFocus = false, onClose }: { withInitialFocus?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const safeRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      {open ? (
        <Modal
          title="Revisar"
          onClose={() => {
            onClose?.();
            setOpen(false);
          }}
          initialFocusRef={withInitialFocus ? safeRef : undefined}
          footer={
            <>
              <button type="button" ref={safeRef}>
                Volver
              </button>
              <button type="button">Confirmar</button>
            </>
          }
        >
          <input aria-label="Campo" />
        </Modal>
      ) : null}
    </>
  );
}

function open() {
  const trigger = screen.getByRole("button", { name: "Abrir" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

describe("Modal", () => {
  it("focuses the dialog on open and the initial focus target when given", () => {
    render(<Harness withInitialFocus />);
    open();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Volver" }));
  });

  it("traps Tab inside the dialog in both directions", () => {
    render(<Harness />);
    open();
    const close = screen.getByRole("button", { name: "Cerrar" });
    const last = screen.getByRole("button", { name: "Confirmar" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("pulls Shift+Tab from the panel itself back to the last control", () => {
    render(<Harness />);
    open();
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Confirmar" }));
  });

  it("closes with Escape and restores focus to the trigger", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = open();
    fireEvent.keyDown(screen.getByLabelText("Campo"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("contains overscroll in the scrollable body so the page behind does not move", () => {
    render(<Harness />);
    open();
    const body = screen.getByLabelText("Campo").parentElement as HTMLElement;
    expect(body.className).toContain("overscroll-contain");
  });
});
