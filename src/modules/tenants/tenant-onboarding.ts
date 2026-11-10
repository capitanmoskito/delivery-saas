import { prisma } from "@/src/lib/prisma";

export type TenantOnboardingSection = {
  id: string;
  label: string;
  href: string;
  complete: boolean;
};

export type TenantOnboardingProgress = {
  percentage: number;
  complete: boolean;
  sections: TenantOnboardingSection[];
};

const sectionLinks = {
  category: { label: "Crear al menos una categoría", href: "/business/categories" },
  product: { label: "Completar un producto con imagen y al menos un adicional", href: "/business/products" },
  logo: { label: "Subir el logo del negocio", href: "/business/settings#branding" },
  general: { label: "Completar la información general", href: "/business/settings#general" },
  address: { label: "Completar la dirección del negocio", href: "/business/settings#address" },
  schedule: { label: "Configurar el horario de servicio", href: "/business/settings#service-hours" },
  payment: { label: "Activar al menos un método de pago", href: "/business/settings#payment-methods" },
  fulfillment: { label: "Configurar envío o recolección", href: "/business/settings#fulfillment" },
} as const;

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export async function getTenantOnboardingProgressForTenants(tenantIds: string[]) {
  const progressByTenant = new Map<string, TenantOnboardingProgress>();
  const uniqueTenantIds = [...new Set(tenantIds)];

  if (uniqueTenantIds.length === 0) return progressByTenant;

  const [profiles, categories, products, providers, transfers, deliverySettings] = await Promise.all([
    prisma.businessProfile.findMany({
      where: { tenantId: { in: uniqueTenantIds } },
      select: {
        tenantId: true,
        businessName: true,
        description: true,
        phone: true,
        phoneNumber: true,
        email: true,
        contactEmail: true,
        logoUrl: true,
        addressLine: true,
        postalCode: true,
        neighborhood: true,
        municipality: true,
        city: true,
        state: true,
        country: true,
        schedules: { select: { enabled: true, openTime: true, closeTime: true } },
      },
    }),
    prisma.category.findMany({
      where: { tenantId: { in: uniqueTenantIds }, active: true, name: { not: "" } },
      select: { tenantId: true },
    }),
    prisma.product.findMany({
      where: {
        tenantId: { in: uniqueTenantIds },
        active: true,
        name: { not: "" },
        description: { not: null },
        imageUrl: { not: null },
        price: { gt: 0 },
        category: { active: true },
        variants: { some: { active: true, name: { not: "" } } },
      },
      select: {
        tenantId: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        category: { select: { tenantId: true } },
        variants: { where: { active: true }, select: { name: true } },
      },
    }),
    prisma.paymentProviderConfig.findMany({
      where: { tenantId: { in: uniqueTenantIds }, enabled: true },
      select: { tenantId: true, credentialsEncrypted: true },
    }),
    prisma.businessTransferDetails.findMany({
      where: { tenantId: { in: uniqueTenantIds }, enabled: true },
      select: { tenantId: true, bankName: true, accountHolder: true, accountNumber: true, clabe: true },
    }),
    prisma.businessDeliverySettings.findMany({
      where: { tenantId: { in: uniqueTenantIds } },
      select: { tenantId: true, pickupEnabled: true, deliveryEnabled: true },
    }),
  ]);

  const profilesByTenant = new Map(profiles.map((profile) => [profile.tenantId, profile]));
  const categoriesByTenant = new Set(categories.map((category) => category.tenantId));
  const productsByTenant = new Set(
    products
      .filter(
        (product) =>
          product.tenantId === product.category.tenantId &&
          hasValue(product.name) &&
          hasValue(product.description) &&
          hasValue(product.imageUrl) &&
          product.price > 0 &&
          product.variants.some((variant) => hasValue(variant.name)),
      )
      .map((product) => product.tenantId),
  );
  const configuredPaymentTenants = new Set([
    ...providers.filter((provider) => hasValue(provider.credentialsEncrypted)).map((provider) => provider.tenantId),
    ...transfers
      .filter(
        (transfer) =>
          hasValue(transfer.bankName) &&
          hasValue(transfer.accountHolder) &&
          (hasValue(transfer.accountNumber) || /^\d{18}$/.test(transfer.clabe ?? "")),
      )
      .map((transfer) => transfer.tenantId),
  ]);
  const deliverySettingsByTenant = new Map(deliverySettings.map((settings) => [settings.tenantId, settings]));

  for (const tenantId of uniqueTenantIds) {
    const profile = profilesByTenant.get(tenantId);
    const sections: TenantOnboardingSection[] = [
      { id: "category", ...sectionLinks.category, complete: categoriesByTenant.has(tenantId) },
      { id: "product", ...sectionLinks.product, complete: productsByTenant.has(tenantId) },
      { id: "logo", ...sectionLinks.logo, complete: hasValue(profile?.logoUrl) },
      {
        id: "general",
        ...sectionLinks.general,
        complete:
          hasValue(profile?.businessName) &&
          hasValue(profile?.description) &&
          hasValue(profile?.phoneNumber ?? profile?.phone) &&
          hasValue(profile?.contactEmail ?? profile?.email),
      },
      {
        id: "address",
        ...sectionLinks.address,
        complete:
          hasValue(profile?.addressLine) &&
          hasValue(profile?.postalCode) &&
          hasValue(profile?.neighborhood) &&
          hasValue(profile?.municipality ?? profile?.city) &&
          hasValue(profile?.state) &&
          hasValue(profile?.country),
      },
      {
        id: "schedule",
        ...sectionLinks.schedule,
        complete: Boolean(
          profile?.schedules.some(
            (schedule) => schedule.enabled && hasValue(schedule.openTime) && hasValue(schedule.closeTime),
          ),
        ),
      },
      { id: "payment", ...sectionLinks.payment, complete: configuredPaymentTenants.has(tenantId) },
      {
        id: "fulfillment",
        ...sectionLinks.fulfillment,
        complete: Boolean(
          deliverySettingsByTenant.get(tenantId)?.pickupEnabled ||
            deliverySettingsByTenant.get(tenantId)?.deliveryEnabled,
        ),
      },
    ];

    const completedSections = sections.filter((section) => section.complete).length;
    progressByTenant.set(tenantId, {
      percentage: Math.round((completedSections / sections.length) * 100),
      complete: completedSections === sections.length,
      sections,
    });
  }

  return progressByTenant;
}

export async function getTenantOnboardingProgress(tenantId: string) {
  const progressByTenant = await getTenantOnboardingProgressForTenants([tenantId]);
  const progress = progressByTenant.get(tenantId);

  if (!progress) {
    throw new Error(`No se pudo calcular el progreso de registro del tenant ${tenantId}.`);
  }

  return progress;
}
