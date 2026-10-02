import { prisma } from "@/src/lib/prisma";
import { decryptPaymentCredentials } from "@/src/lib/payment-credentials";

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
  additionIds: string[];
};

export type CheckoutLineSnapshot = {
  productId: string;
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
  subtotal: number;
  discountTotal: number;
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
  userId,
}: {
  restaurantId: string;
  items: CheckoutItemInput[];
  discountCode: string;
  paymentMethod: "card" | "transfer";
  userId: string;
}): Promise<CheckoutQuote> {
  if (!restaurantId || items.length === 0) throw new CheckoutQuoteError("El carrito está vacío o no es válido.");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, tenantId: true, name: true, currency: true, active: true, tenant: { select: { businessName: true } } },
  });
  if (!restaurant || !restaurant.active) throw new CheckoutQuoteError("El negocio no está disponible.", 404);

  const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { tenantId: restaurant.tenantId, active: true, id: { in: uniqueProductIds } },
    include: { variants: { where: { active: true }, select: { id: true, name: true, price: true } } },
  });
  const productsById = new Map(products.map((product) => [product.id, product]));
  if (productsById.size !== uniqueProductIds.length) throw new CheckoutQuoteError("Uno o más productos ya no están disponibles.");

  const quantities = new Map<string, number>();
  const itemSubtotals = new Map<string, number>();
  const lineSnapshots: CheckoutLineSnapshot[] = items.map((item) => {
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
  const total = roundMoney(Math.max(0, subtotal - discountTotal));
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
  const transferEnabled = Boolean(transfer?.enabled && transfer.bankName && transfer.accountHolder && (transfer.accountNumber || transfer.clabe));
  const profileComplete = Boolean(
    user.firstName && user.lastNamePaternal && address?.street && address.postalCode && address.neighborhood && address.city && address.state && /^\d{10}$/.test(address.contactPhone || ""),
  );

  return {
    restaurantId: restaurant.id,
    tenantId: restaurant.tenantId,
    businessName: restaurant.tenant.businessName || restaurant.name,
    currency: restaurant.currency,
    items: lineSnapshots,
    subtotal,
    discountTotal,
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
