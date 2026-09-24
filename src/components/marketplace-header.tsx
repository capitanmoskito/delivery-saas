"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";

import LogoutButton from "@/src/components/logout-button";
import { useCartCount } from "@/src/hooks/use-cart-count";

type SessionUser = { id: string; email: string; role: string } | null;

export default function MarketplaceHeader() {
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);
  const cartCount = useCartCount();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user: SessionUser }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isCustomer = user?.role === "customer";

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
        <Link href="/" className="font-bold">
          TuPedidos
        </Link>

        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {isCustomer ? (
                <>
                  <Link href="/customer/profile">Perfil</Link>
                  <CartLink count={cartCount} />
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login">Iniciar sesión</Link>
                  <Link href="/customer/register">Registrarse</Link>
                  <Link href="/register-business">Registrar Negocio</Link>
                  <CartLink count={cartCount} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function CartLink({ count }: { count: number }) {
  return (
    <Link href="/cart" className="relative flex items-center" aria-label="Carrito">
      <ShoppingCart size={22} />
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-action text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}