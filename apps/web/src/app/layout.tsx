import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-noto-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "La Livre — Portal de clientes", template: "%s · La Livre" },
  description: "Catálogo mayorista de libros para librerías y revendedores.",
};

/**
 * viewportFit "cover" lets env(safe-area-inset-*) report real values on notched phones,
 * so bottom-pinned bars (order summary, sheet footers) clear the home indicator.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={notoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
