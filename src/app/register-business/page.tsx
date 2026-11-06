import type { Metadata } from "next";
import { RegisterBusinessLanding } from "./register-business-landing";

export const metadata: Metadata = {
  title: "Registra tu negocio | DELIM",
  description:
    "Digitaliza tu negocio gastronómico con DELIM. Crea tu tienda en línea, administra pedidos y comienza con 15 días de prueba gratis.",
};

export default function RegisterBusinessPage() {
  return <RegisterBusinessLanding />;
}