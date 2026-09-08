import Link from "next/link";
import LogoutButton
from "@/src/components/logout-button";

export default function SaaSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">

          <h1 className="text-xl font-bold">
            Delivery SaaS
          </h1>

          <nav className="flex gap-4">
            <Link href="/saas/dashboard">Dashboard</Link>
            <Link href="/saas/businesses">Negocios</Link>
            <Link href="/saas/plans">Planes</Link>
            <Link href="/saas/promotions">Promociones</Link>
            <Link href="/saas/referrals">Referidos</Link>
            <Link href="/saas/testimonials">Testimonios</Link>
            <Link href="/saas/banners">Banners</Link>
            <Link href="/saas/settings">Configuración</Link>
            
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