import Link from "next/link";
import { Store } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="DELIM, inicio">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d95d39] text-white">
            <Store size={16} aria-hidden="true" />
          </span>
          <span className="font-extrabold tracking-[0.08em] text-[#2b2118]">DELIM</span>
        </Link>
        <nav aria-label="Enlaces del pie de página" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-600">
          <Link href="/" className="transition hover:text-[#d95d39]">Explorar negocios</Link>
          <Link href="/register-business" className="transition hover:text-[#d95d39]">Registrar negocio</Link>
          <Link href="/login" className="transition hover:text-[#d95d39]">Iniciar sesión</Link>
        </nav>
        <p className="text-xs text-stone-500">© {new Date().getFullYear()} DELIM</p>
      </div>
    </footer>
  );
}