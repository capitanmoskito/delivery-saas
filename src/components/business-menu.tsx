"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import LogoutButton from "@/src/components/logout-button";

type MenuItem = {
  href: string;
  label: string;
};

const menuItems: MenuItem[] = [
  { href: "/business/dashboard", label: "Dashboard" },
  { href: "/business/menu", label: "Menú" },
  { href: "/business/customers", label: "Clientes" },
  { href: "/business/orders", label: "Pedidos" },
  { href: "/business/categories", label: "Categorías" },
  { href: "/business/products", label: "Productos" },
  { href: "/business/promotions", label: "Promociones" },
  { href: "/business/packages", label: "Paquetes" },
  { href: "/business/settings", label: "Configuración" }
];

export default function BusinessMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative z-50 rounded-lg p-2 text-slate-700 transition hover:bg-slate-100"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="business-navigation"
      >
        {open ? <X size={26} /> : <Menu size={26} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.aside
            id="business-navigation"
            className="absolute right-0 top-0 flex h-full w-[min(22rem,88vw)] flex-col bg-white px-6 pb-6 pt-20 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Navegación del negocio">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="border-t pt-4">
              <LogoutButton />
            </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
