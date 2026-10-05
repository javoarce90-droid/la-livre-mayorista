import { describe, expect, it, vi } from "vitest";

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

describe("Home page", () => {
  it("sends visitors to the portal dashboard (proxy handles anonymous users)", async () => {
    const { default: Home } = await import("./page");
    Home();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
