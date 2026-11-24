import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIBAYONA | Soluciones industriales y eléctricas",
  description: "Catálogo de productos industriales y eléctricos de CIBAYONA. Consulta disponibilidad y coordina tu pedido.",
  applicationName: "CIBAYONA",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cibayona.vercel.app")
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
