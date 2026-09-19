import Link
from "next/link";

import BusinessMenu
from "@/src/components/business-menu";

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

          <Link
            href="/business/dashboard"
            className="text-xl font-bold"
          >
            {tenant?.businessName || "Portal Negocio"}
          </Link>

          <BusinessMenu />
        </div>

      </header>

      <main className="mx-auto max-w-7xl p-6">
        {children}
      </main>

    </div>
  );
}