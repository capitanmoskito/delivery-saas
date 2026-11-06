import type { Metadata } from "next";
import "./globals.css";
import SiteFooter from "@/src/components/site-footer";

import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta =
  Plus_Jakarta_Sans({

    subsets: ["latin"],
  });

export const metadata: Metadata = {
  title: "DELIM",
  description: "Pide comida de tus negocios favoritos con DELIM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="es">

      <body className={`${jakarta.className} flex min-h-screen flex-col`}>
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>

    </html>
  );
}