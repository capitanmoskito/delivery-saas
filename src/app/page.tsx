import { prisma } from "@/src/lib/prisma";
import Image from "next/image";
import MarketplaceHeader from "@/src/components/marketplace-header";
import MarketplaceCategories from "@/src/components/marketplace-categories";
import { getTenantOnboardingProgressForTenants } from "@/src/modules/tenants/tenant-onboarding";

export default async function HomePage() {
  const restaurantsWithTenant = await prisma.restaurant.findMany({
    where: {
      active: true,
      tenant: { status: { in: ["trial", "pending_payment", "active"] } },
    },
    select: { id: true, tenantId: true, name: true },
  });

  const onboardingByTenant = await getTenantOnboardingProgressForTenants(
    restaurantsWithTenant.map((restaurant) => restaurant.tenantId),
  );
  const restaurants = restaurantsWithTenant.filter(
    (restaurant) => onboardingByTenant.get(restaurant.tenantId)?.complete,
  );
  const tenantIds = [...new Set(restaurants.map((restaurant) => restaurant.tenantId))];
  const [profiles, categories] = await Promise.all([
    prisma.businessProfile.findMany({
      where: { tenantId: { in: tenantIds } },
      select: {
        tenantId: true,
        businessName: true,
        description: true,
        bannerUrl: true,
        logoUrl: true,
        latitude: true,
        longitude: true,
      },
    }),
    prisma.category.findMany({
      where: { tenantId: { in: tenantIds }, active: true },
      select: { tenantId: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const profilesByTenant = new Map(profiles.map((profile) => [profile.tenantId, profile]));
  const restaurantsByTenant = new Map(restaurants.map((restaurant) => [restaurant.tenantId, restaurant]));
  const groupedCategories = new Map<string, { name: string; tenantIds: Set<string> }>();

  for (const category of categories) {
    const name = category.name.trim();
    if (!name || !restaurantsByTenant.has(category.tenantId)) continue;

    const key = name.toLocaleLowerCase("es-MX");
    const group = groupedCategories.get(key) ?? { name, tenantIds: new Set<string>() };
    group.tenantIds.add(category.tenantId);
    groupedCategories.set(key, group);
  }

  const storesForTenants = (tenantIdSet: Set<string>) =>
    restaurants
      .filter((restaurant) => tenantIdSet.has(restaurant.tenantId))
      .map((restaurant) => {
        const profile = profilesByTenant.get(restaurant.tenantId);
        return {
          id: restaurant.id,
          name: profile?.businessName || restaurant.name,
          description: profile?.description,
          imageUrl: profile?.bannerUrl || undefined,
          logoUrl: profile?.logoUrl || undefined,
          latitude: profile?.latitude ?? null,
          longitude: profile?.longitude ?? null,
        };
      });

  const categoryGroups = [...groupedCategories.values()]
    .sort((left, right) => left.name.localeCompare(right.name, "es-MX"))
    .map(({ name, tenantIds: groupTenantIds }, index) => ({
      id: `categoria-${index}-${name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}`,
      name,
      stores: storesForTenants(groupTenantIds),
    }));

  const categorizedTenantIds = new Set(
    [...groupedCategories.values()].flatMap((group) => [...group.tenantIds]),
  );
  const uncategorizedTenantIds = new Set(
    restaurants
      .map((restaurant) => restaurant.tenantId)
      .filter((tenantId) => !categorizedTenantIds.has(tenantId)),
  );

  if (uncategorizedTenantIds.size > 0) {
    categoryGroups.push({
      id: "mas-negocios",
      name: categoryGroups.length > 0 ? "Más negocios" : "Negocios para descubrir",
      stores: storesForTenants(uncategorizedTenantIds),
    });
  }

  return (
    <main className="bg-[#faf9f6] text-[#2b2118]">
      <MarketplaceHeader />
      <section className="px-4 pb-8 pt-5 sm:px-8 sm:pb-12 sm:pt-8">
        <div className="relative mx-auto flex min-h-85 max-w-7xl items-end overflow-hidden rounded-xl bg-[#2b2118] sm:min-h-110">
          <Image
            src="/uploads/1789785401220-product.webp"
            alt="Tacos al pastor recién preparados"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-r from-[#211810]/85 via-[#211810]/55 to-[#211810]/10" />
          <div className="relative z-10 max-w-3xl px-6 py-10 sm:px-12 sm:py-14">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-[#f4b942]">
              Lo que se te antoja, más cerca
            </p>
            <h1 className="text-4xl leading-[1.08] font-extrabold text-white sm:text-6xl">
              ¿Se te antojó algo delicioso? Pídelo por <span className="text-[#f4b942]">DÉLIMMM!</span>
            </h1>
            <a
              href="#categorias"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-lg bg-[#d95d39] px-5 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#c64e2d]"
            >
              Explorar negocios <span aria-hidden="true" className="ml-2">→</span>
            </a>
          </div>
        </div>
      </section>
      <MarketplaceCategories groups={categoryGroups} />
    </main>
  );
}