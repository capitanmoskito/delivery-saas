import { prisma } from "@/src/lib/prisma";

import PublicStoreMenu from "@/src/components/public-store-menu";
import MarketplaceHeader from "@/src/components/marketplace-header";
import StoreHero from "@/src/components/store-hero";
import StoreReviews from "@/src/components/store-reviews";
import { isBusinessOpenNow } from "@/src/lib/business-hours";

export default async function StorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: { tenant: true },
  });

  if (!restaurant) {
    return <div>Negocio no encontrado</div>;
  }

  const [profile, products, packages, reviewStats, topReviews, favoriteGroups] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { tenantId: restaurant.tenantId },
      include: { schedules: true },
    }),
    prisma.product.findMany({
      where: { tenantId: restaurant.tenantId, active: true },
      include: { variants: { where: { active: true } }, category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.package.findMany({
      where: { tenantId: restaurant.tenantId, active: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeReview.aggregate({
      where: { tenantId: restaurant.tenantId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.storeReview.findMany({
      where: { tenantId: restaurant.tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { tenantId: restaurant.tenantId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 4,
    }),
  ]);

  const isOpen = isBusinessOpenNow(profile?.schedules ?? []);

  const productItems = products.map((product: (typeof products)[number]) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    variants: product.variants,
  }));

  const favoriteProductIds = favoriteGroups.map((group: (typeof favoriteGroups)[number]) => group.productId);

  const avgPrepMinutes =
    products.length > 0
      ? products.reduce((sum: number, product: (typeof products)[number]) => sum + product.prepMinutes, 0) / products.length
      : 20;
  const estimatedMin = Math.round(avgPrepMinutes + 10);
  const estimatedMax = Math.round(avgPrepMinutes + 25);
  const estimatedDeliveryLabel = `${estimatedMin}-${estimatedMax} min`;

  const address = profile ? [profile.addressLine, profile.neighborhood, profile.city].filter(Boolean).join(", ") : null;

  return (
    <main>
      <MarketplaceHeader />

      <StoreHero
        businessName={profile?.businessName || restaurant.name}
        description={profile?.description}
        logoUrl={profile?.logoUrl}
        bannerUrl={profile?.bannerUrl}
        isOpen={isOpen}
        rating={reviewStats._avg.rating ?? 0}
        reviewCount={reviewStats._count.rating}
        address={address}
        estimatedDeliveryLabel={estimatedDeliveryLabel}
      />

      <PublicStoreMenu
        restaurantId={restaurant.id}
        products={productItems}
        packages={packages}
        favoriteProductIds={favoriteProductIds}
        currency={restaurant.currency}
      />

      <StoreReviews reviews={topReviews} averageRating={reviewStats._avg.rating ?? 0} reviewCount={reviewStats._count.rating} />
    </main>
  );
}