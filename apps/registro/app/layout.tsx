import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reinado 2026 · Administración",
  description: "Panel seguro de candidatas, códigos y votación."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
