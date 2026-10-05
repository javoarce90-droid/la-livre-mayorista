import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Livre — Catálogo mayorista de libros",
  description: "Catálogo mayorista de libros para librerías y revendedores.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
