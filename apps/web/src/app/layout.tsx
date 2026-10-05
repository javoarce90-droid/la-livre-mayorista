import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-noto-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "La Livre — Portal de clientes", template: "%s · La Livre" },
  description: "Catálogo mayorista de libros para librerías y revendedores.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={notoSans.variable}>
      <body>{children}</body>
    </html>
  );
}
