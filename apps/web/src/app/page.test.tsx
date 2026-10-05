import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("identifies the product as a wholesale book catalog", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain("La Livre");
    expect(html).toContain("Catálogo mayorista de libros");
  });
});
