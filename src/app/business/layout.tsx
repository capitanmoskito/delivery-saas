import Link from "next/link";

import LogoutButton
from "@/src/components/logout-button";

import { getCurrentUser }
from "@/src/lib/current-user";

import { prisma }
from "@/src/lib/prisma";

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const tenant = user?.tenantId
    ? await prisma.tenant.findUnique({
        where: {
          id: user.tenantId
        },
        select: {
          businessName: true
        }
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">

          <h1 className="text-xl font-bold">
            {tenant?.businessName || "Portal Negocio"}
          </h1>

          <nav className="flex flex-wrap gap-4">

            <Link href="/business/dashboard">
              Dashboard
            </Link>

            <Link href="/business/menu">
              Menú
            </Link>

            <Link href="/business/customers">
              Clientes
            </Link>

            <Link href="/business/orders">
              Pedidos
            </Link>

            <Link href="/business/categories">
              Categorías
            </Link>

            <Link href="/business/products">
              Productos
            </Link>

            <Link href="/business/promotions">
              Promociones
            </Link>

            <Link href="/business/packages">
              Paquetes
            </Link>

            <Link href="/business/settings">
              Configuración
            </Link>
            

          </nav>
        <LogoutButton />
        </div>

      </header>

      <main className="mx-auto max-w-7xl p-6">
        {children}
      </main>

    </div>
  );
}