import type { Metadata } from "next";
import "./globals.css";

import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta =
  Plus_Jakarta_Sans({

    subsets: ["latin"],
  });

export const metadata: Metadata = {
  title: "TuPedidos",
  description: "Marketplace gastronómico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="es">

      <body className={jakarta.className}>

        {children}

      </body>

    </html>
  );
}