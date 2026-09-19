import { prisma }
from "@/src/lib/prisma";

import PublicStoreMenu from "@/src/components/public-store-menu";
import MarketplaceHeader from "@/src/components/marketplace-header";

export default async function StorePage({
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {

  const { id } = await params;

  const restaurant =
    await prisma.restaurant.findUnique({

      where: {
        id
      },
      include: {
        tenant: true
      }
    });

  if (!restaurant) {

    return (
      <div>
        Negocio no encontrado
      </div>
    );
  }

  const [profile, products] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { tenantId: restaurant.tenantId } }),
    prisma.product.findMany({ where: { tenantId: restaurant.tenantId, active: true }, include: { variants: { where: { active: true } } }, orderBy: { createdAt: "desc" } })
  ]);

  return <main><MarketplaceHeader /><section className="bg-action px-6 py-12 text-white"><div className="mx-auto max-w-6xl"><h1 className="text-4xl font-bold">{profile?.businessName || restaurant.name}</h1>{profile?.description && <p className="mt-3 max-w-2xl">{profile.description}</p>}</div></section><section className="mx-auto max-w-6xl p-6"><h2 className="mb-5 text-2xl font-bold">Menú</h2><PublicStoreMenu restaurantId={restaurant.id} products={products} /></section></main>;
}