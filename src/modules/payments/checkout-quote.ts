import { prisma } from "@/src/lib/prisma";
import { decryptPaymentCredentials } from "@/src/lib/payment-credentials";
import { calculateDeliveryFee, defaultDeliverySettings, type DeliveryFeeSettings } from "@/src/modules/delivery/delivery-fee";

export type FulfillmentType = "pickup" | "delivery";

export type CheckoutItemInput = {
  productId: string;
  packageId?: string;
  quantity: number;
  additionIds: string[];
};

export type CheckoutOrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  additions: Array<{ id: string; name: string; price: number }>;
};

export type CheckoutLineSnapshot = {
  productId: string;
  packageId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  additionIds: string[];
  additions: Array<{ id: string; name: string; price: number }>;
};

export type CheckoutQuote = {
  restaurantId: string;
  tenantId: string;
  businessName: string;
  currency: string;
  items: CheckoutLineSnapshot[];
  orderItems: CheckoutOrderItem[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  deliveryDistanceKm: number | null;
  deliveryError: string | null;
  fulfillmentType: FulfillmentType;
  fulfillment: DeliveryFeeSettings;
  pickupAddress: string | null;
  total: number;
  discountCode: string | null;
  promoCodeId: string | null;
  appliedPromotions: Array<{ id: string; name: string; discount: number; code?: string }>;
  profileComplete: boolean;
  paymentMethods: {
    cardProviders: Array<"mercadopago" | "clip">;
    transferEnabled: boolean;
    transfer: null | { bankName: string; accountHolder: string; accountNumber: string | null; clabe: string | null; instructions: string | null };
  };
};

export class CheckoutQuoteError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
  }
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function buildCheckoutQuote({
  restaurantId,
  items,
  discountCode,
  paymentMethod,
  fulfillmentType,
  userId,
}: {
  restaurantId: string;
  items: CheckoutItemInput[];
  discountCode: string;
  paymentMethod: "card" | "transfer";
  fulfillmentType: FulfillmentType;
  userId: string;
}): Promise<CheckoutQuote> {
  if (!restaurantId || items.length === 0) throw new CheckoutQuoteError("El carrito está vacío o no es válido.");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, tenantId: true, name: true, currency: true, active: true, tenant: { select: { businessName: true } } },
  });
  if (!restaurant || !restaurant.active) throw new CheckoutQuoteError("El negocio no está disponible.", 404);

  const productItems = items.filter((item) => !item.packageId);
  const packageItems = items.filter((item) => item.packageId);
  const uniquePackageIds = [...new Set(packageItems.map((item) => item.packageId as string))];
  const packages = uniquePackageIds.length > 0
    ? await prisma.package.findMany({
        where: { tenantId: restaurant.tenantId, active: true, id: { in: uniquePackageIds } },
        include: {
          items: { include: { product: { select: { id: true, name: true, price: true, active: true } } } },
          complements: { where: { active: true }, select: { id: true, name: true, price: true } },
        },
      })
    : [];
  const packagesById = new Map(packages.map((pkg) => [pkg.id, pkg]));
  if (packagesById.size !== uniquePackageIds.length) throw new CheckoutQuoteError("Uno o más paquetes ya no están disponibles.");

  const uniqueProductIds = [...new Set(productItems.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { tenantId: restaurant.tenantId, active: true, id: { in: uniqueProductIds } },
    include: { variants: { where: { active: true }, select: { id: true, name: true, price: true } } },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));
  if (productsById.size !== uniqueProductIds.length) throw new CheckoutQuoteError("Uno o más productos ya no están disponibles.");

  const quantities = new Map<string, number>();
  const itemSubtotals = new Map<string, number>();
  const orderItems: CheckoutOrderItem[] = [];
  const lineSnapshots: CheckoutLineSnapshot[] = items.map((item) => {
    if (item.packageId) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new CheckoutQuoteError("Una cantidad del carrito no es válida.");
      }
      const pkg = packagesById.get(item.packageId);
      if (!pkg || pkg.items.length === 0 || pkg.items.some((packageItem) => !packageItem.product.active)) {
        throw new CheckoutQuoteError("Uno o más paquetes ya no están disponibles.");
      }
      const regularTotal = pkg.items.reduce((sum, packageItem) => sum + packageItem.product.price * packageItem.quantity, 0);
      const unitsTotal = pkg.items.reduce((sum, packageItem) => sum + packageItem.quantity, 0);
      const complementIds = [...new Set(item.additionIds)];
      const complements = complementIds.map((id) => pkg.complements.find((complement) => complement.id === id)).filter((complement) => complement !== undefined);
      if (complements.length !== complementIds.length) throw new CheckoutQuoteError(`Los complementos de ${pkg.name} ya no están disponibles.`);
      const unitPackagePrice = roundMoney(pkg.price + complements.reduce((sum, complement) => sum + complement.price, 0));
      const complementSnapshots = complements.map((complement) => ({ id: complement.id, name: complement.name, price: complement.price }));
      const packageTotal = roundMoney(unitPackagePrice * item.quantity);
      let allocated = 0;
      pkg.items.forEach((packageItem, index) => {
        const isLast = index === pkg.items.length - 1;
        const share = regularTotal > 0 ? (packageItem.product.price * packageItem.quantity) / regularTotal : packageItem.quantity / unitsTotal;
        const totalPrice = isLast ? roundMoney(packageTotal - allocated) : roundMoney(packageTotal * share);
        allocated += totalPrice;
        const quantity = packageItem.quantity * item.quantity;
        orderItems.push({ productId: packageItem.productId, quantity, unitPrice: roundMoney(totalPrice / quantity), totalPrice, additions: index === 0 ? complementSnapshots : [] });
      });
      return {
        productId: "",
        packageId: pkg.id,
        name: pkg.name,
        quantity: item.quantity,
        unitPrice: unitPackagePrice,
        totalPrice: packageTotal,
        additionIds: complementIds,
        additions: complementSnapshots,
      };
    }
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new CheckoutQuoteError("Una cantidad del carrito no es válida.");
    }
    const product = productsById.get(item.productId);
    if (!product) throw new CheckoutQuoteError("Uno o más productos ya no están disponibles.");
    const additionIds = [...new Set(item.additionIds)];
    const variantsById = new Map(product.variants.map((variant) => [variant.id, variant]));
    const additions = additionIds.map((id) => variantsById.get(id)).filter((variant) => variant !== undefined);
    if (additions.length !== additionIds.length) throw new CheckoutQuoteError(`Los adicionales de ${product.name} ya no están disponibles.`);

    const unitPrice = roundMoney(product.price + additions.reduce((sum, variant) => sum + variant.price, 0));
    const totalPrice = roundMoney(unitPrice * item.quantity);
    quantities.set(product.id, (quantities.get(product.id) || 0) + item.quantity);
    itemSubtotals.set(product.id, (itemSubtotals.get(product.id) || 0) + totalPrice);
    orderItems.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      additions: additions.map((addition) => ({ id: addition.id, name: addition.name, price: addition.price })),
    });
    return {
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      additionIds,
      additions: additions.map((addition) => ({ id: addition.id, name: addition.name, price: addition.price })),
    };
  });

  const subtotal = roundMoney(lineSnapshots.reduce((sum, item) => sum + item.totalPrice, 0));
  const now = new Date();
  const promotions = await prisma.businessPromotion.findMany({
    where: {
      tenantId: restaurant.tenantId,
      active: true,
      appliesToTakeawayDelivery: true,
      ...(paymentMethod === "card" ? { appliesToCard: true } : { appliesToCash: true }),
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    include: { targetProducts: true, requiredProducts: true },
  });

  const appliedPromotions: CheckoutQuote["appliedPromotions"] = [];
  let promotionDiscount = 0;
  for (const promotion of promotions) {
    if (!promotion.requiredProducts.every((requirement) => (quantities.get(requirement.productId) || 0) >= requirement.quantity)) continue;
    if (!promotion.discountType || promotion.targetProducts.length === 0) continue;

    const targetSubtotal = promotion.targetProducts.reduce((sum, target) => sum + (itemSubtotals.get(target.productId) || 0), 0);
    const discount = promotion.discountType === "percentage"
      ? targetSubtotal * ((promotion.discountPercent || 0) / 100)
      : Math.min(targetSubtotal, promotion.discountAmount || 0);
    if (discount > 0) {
      promotionDiscount += discount;
      appliedPromotions.push({ id: promotion.id, name: promotion.name, discount: roundMoney(discount) });
    }
  }

  let promoCodeId: string | null = null;
  let normalizedCode: string | null = null;
  let couponDiscount = 0;
  if (discountCode.trim()) {
    normalizedCode = discountCode.trim().toUpperCase();
    const promoCode = await prisma.promoCode.findUnique({ where: { code: normalizedCode } });
    const expired = promoCode?.endsAt ? promoCode.endsAt < now : false;
    const notStarted = promoCode?.startsAt ? promoCode.startsAt > now : false;
    const limitReached = promoCode?.usageLimit !== null && promoCode?.usageLimit !== undefined && promoCode.usedCount >= promoCode.usageLimit;
    if (!promoCode || !promoCode.active || expired || notStarted || limitReached || promoCode.discountPercent <= 0) {
      throw new CheckoutQuoteError("El código de descuento no es válido o ya no está disponible.");
    }
    promoCodeId = promoCode.id;
    couponDiscount = Math.max(0, subtotal - promotionDiscount) * Math.min(promoCode.discountPercent, 100) / 100;
    appliedPromotions.push({ id: promoCode.id, name: promoCode.description || `Código ${promoCode.code}`, discount: roundMoney(couponDiscount), code: promoCode.code });
  }

  const discountTotal = roundMoney(Math.min(subtotal, promotionDiscount + couponDiscount));
  const [deliveryRecord, businessProfile] = await Promise.all([
    prisma.businessDeliverySettings.findUnique({ where: { tenantId: restaurant.tenantId } }),
    prisma.businessProfile.findUnique({
      where: { tenantId: restaurant.tenantId },
      select: { latitude: true, longitude: true, addressLine: true, neighborhood: true, city: true, state: true, postalCode: true },
    }),
  ]);
  const fulfillment: DeliveryFeeSettings = deliveryRecord
    ? {
        pickupEnabled: deliveryRecord.pickupEnabled,
        deliveryEnabled: deliveryRecord.deliveryEnabled,
        feeType: deliveryRecord.feeType === "per_km" ? "per_km" : "fixed",
        fixedFee: deliveryRecord.fixedFee,
        perKmFee: deliveryRecord.perKmFee,
        maxDistanceKm: deliveryRecord.maxDistanceKm,
      }
    : defaultDeliverySettings;
  const pickupAddress = businessProfile
    ? [businessProfile.addressLine, businessProfile.neighborhood, businessProfile.city, businessProfile.state, businessProfile.postalCode].filter(Boolean).join(", ") || null
    : null;
  const [providers, transfer, user, address] = await Promise.all([
    prisma.paymentProviderConfig.findMany({ where: { tenantId: restaurant.tenantId, enabled: true }, select: { provider: true, credentialsEncrypted: true } }),
    prisma.businessTransferDetails.findUnique({ where: { tenantId: restaurant.tenantId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastNamePaternal: true, role: true } }),
    prisma.customerAddress.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } }),
  ]);
  if (!user || user.role !== "customer") throw new CheckoutQuoteError("La sesión de cliente ya no es válida.", 401);
  const cardProviders: Array<"mercadopago" | "clip"> = [];
  for (const provider of providers) {
    if (provider.provider !== "mercadopago" && provider.provider !== "clip") continue;
    try {
      const credentials = decryptPaymentCredentials(provider.credentialsEncrypted);
      const configured = provider.provider === "mercadopago"
        ? Boolean(credentials.mercadoPagoAccessToken && credentials.mercadoPagoWebhookSecret)
        : Boolean(credentials.clipApiKey && credentials.clipApiSecret);
      if (configured) cardProviders.push(provider.provider);
    } catch {
      continue;
    }
  }
  let deliveryFee = 0;
  let deliveryDistanceKm: number | null = null;
  let deliveryError: string | null = null;
  if (fulfillmentType === "delivery") {
    const result = calculateDeliveryFee(
      fulfillment,
      { latitude: businessProfile?.latitude ?? null, longitude: businessProfile?.longitude ?? null },
      { latitude: address?.latitude ?? null, longitude: address?.longitude ?? null },
    );
    if (result.ok) {
      deliveryFee = result.fee;
      deliveryDistanceKm = result.distanceKm;
    } else {
      deliveryError = result.error;
    }
  } else if (!fulfillment.pickupEnabled) {
    deliveryError = "Este negocio no ofrece recolección en tienda.";
  }
  const total = roundMoney(Math.max(0, subtotal - discountTotal) + deliveryFee);
  const transferEnabled = Boolean(transfer?.enabled && transfer.bankName && transfer.accountHolder && (transfer.accountNumber || transfer.clabe));
  const profileComplete = Boolean(
    user.firstName && user.lastNamePaternal && (fulfillmentType === "pickup" || (address?.street && address.postalCode && address.neighborhood && address.city && address.state && /^\d{10}$/.test(address.contactPhone || ""))),
  );

  return {
    restaurantId: restaurant.id,
    tenantId: restaurant.tenantId,
    businessName: restaurant.tenant.businessName || restaurant.name,
    currency: restaurant.currency,
    items: lineSnapshots,
    orderItems,
    subtotal,
    discountTotal,
    deliveryFee,
    deliveryDistanceKm,
    deliveryError,
    fulfillmentType,
    fulfillment,
    pickupAddress,
    total,
    discountCode: normalizedCode,
    promoCodeId,
    appliedPromotions,
    profileComplete,
    paymentMethods: {
      cardProviders,
      transferEnabled,
      transfer: transferEnabled && transfer
        ? {
            bankName: transfer.bankName,
            accountHolder: transfer.accountHolder,
            accountNumber: transfer.accountNumber,
            clabe: transfer.clabe,
            instructions: transfer.instructions,
          }
        : null,
    },
  };
}
