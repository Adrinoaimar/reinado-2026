import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reinado 2026 · Tu voto, tu reina",
  description: "Conoce a las candidatas y emite tu voto definitivo con un código único."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
