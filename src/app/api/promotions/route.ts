import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

type ProductRuleInput = {
  productId?: unknown;
  quantity?: unknown;
};

type PromotionInput = {
  name: string;
  description: string;
  imageUrl: string;
  discountType: "percentage" | "fixed_amount" | null;
  discountValue: number;
  startsAt: Date;
  endsAt: Date;
  targetProductIds: string[];
  requiredProducts: Array<{ productId: string; quantity: number }>;
  freeProducts: Array<{ productId: string; quantity: number }>;
  appliesToTakeawayDelivery: boolean;
  appliesToLocalOrders: boolean;
  appliesToCash: boolean;
  appliesToCard: boolean;
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const promotions = await prisma.businessPromotion.findMany({
      where: { tenantId: user.tenantId },
      include: {
        targetProducts: { include: { product: true } },
        requiredProducts: { include: { product: true } },
        freeProducts: { include: { product: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(promotions);
  } catch (error) {
    console.error("Error fetching promotions:", error);
    return NextResponse.json({ error: "No se pudieron cargar las promociones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const input = parsePromotionInput(await request.json());

    if ("error" in input) {
      return NextResponse.json({ error: input.error }, { status: 400 });
    }

    const productError = await validateProducts(user.tenantId, input);

    if (productError) {
      return NextResponse.json({ error: productError }, { status: 400 });
    }

    const promotion = await prisma.businessPromotion.create({
      data: {
        tenantId: user.tenantId,
        ...promotionFields(input),
        targetProducts: { create: input.targetProductIds.map((productId) => ({ productId })) },
        requiredProducts: { create: input.requiredProducts },
        freeProducts: { create: input.freeProducts }
      },
      include: promotionInclude
    });

    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error("Error creating promotion:", error);
    return NextResponse.json({ error: "No se pudo crear la promoción" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const body = await request.json();
    const promotionId = String(body.id ?? "");
    const input = parsePromotionInput(body);

    if (!promotionId || "error" in input) {
      return NextResponse.json({ error: "error" in input ? input.error : "Promoción no válida" }, { status: 400 });
    }

    const existingPromotion = await prisma.businessPromotion.findFirst({
      where: { id: promotionId, tenantId: user.tenantId },
      select: { id: true }
    });

    if (!existingPromotion) {
      return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }

    const productError = await validateProducts(user.tenantId, input);

    if (productError) {
      return NextResponse.json({ error: productError }, { status: 400 });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.businessPromotion.update({
        where: { id: promotionId },
        data: promotionFields(input)
      });
      await transaction.promotionTargetProduct.deleteMany({ where: { promotionId } });
      await transaction.promotionRequiredProduct.deleteMany({ where: { promotionId } });
      await transaction.promotionFreeProduct.deleteMany({ where: { promotionId } });
      await transaction.promotionTargetProduct.createMany({
        data: input.targetProductIds.map((productId) => ({ promotionId, productId }))
      });
      await transaction.promotionRequiredProduct.createMany({
        data: input.requiredProducts.map((item) => ({ promotionId, ...item }))
      });
      await transaction.promotionFreeProduct.createMany({
        data: input.freeProducts.map((item) => ({ promotionId, ...item }))
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating promotion:", error);
    return NextResponse.json({ error: "No se pudo actualizar la promoción" }, { status: 500 });
  }
}

const promotionInclude = {
  targetProducts: { include: { product: true } },
  requiredProducts: { include: { product: true } },
  freeProducts: { include: { product: true } }
};

function promotionFields(input: PromotionInput) {
  return {
    name: input.name,
    description: input.description,
    imageUrl: input.imageUrl,
    discountType: input.discountType,
    discountPercent: input.discountType === "percentage" ? input.discountValue : null,
    discountAmount: input.discountType === "fixed_amount" ? input.discountValue : null,
    startsAt: input.startsAt,
    endsAt: input.endsAt
    ,
    appliesToTakeawayDelivery: input.appliesToTakeawayDelivery,
    appliesToLocalOrders: input.appliesToLocalOrders,
    appliesToCash: input.appliesToCash,
    appliesToCard: input.appliesToCard
  };
}

async function validateProducts(tenantId: string, input: PromotionInput): Promise<string | null> {
  const productIds = new Set([
    ...input.targetProductIds,
    ...input.requiredProducts.map((item) => item.productId),
    ...input.freeProducts.map((item) => item.productId)
  ]);
  const products = await prisma.product.count({
    where: { tenantId, active: true, id: { in: Array.from(productIds) } }
  });

  return products === productIds.size ? null : "Uno o más productos no están disponibles";
}

function parsePromotionInput(body: unknown): PromotionInput | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Promoción no válida" };
  }

  const data = body as Record<string, unknown>;
  const name = String(data.name ?? "").trim();
  const startsAt = new Date(String(data.startsAt ?? ""));
  const endsAt = new Date(String(data.endsAt ?? ""));
  const selectedType = String(data.discountType ?? "free_product");
  const discountType = selectedType === "percentage" || selectedType === "fixed_amount" ? selectedType : null;
  const discountValue = Number(data.discountValue ?? 0);
  const targetProductIds = normalizeProductIds(data.targetProductIds);
  const requiredProducts = normalizeProductRules(data.requiredProducts);
  const freeProducts = normalizeProductRules(data.freeProducts);
  const appliesToTakeawayDelivery = data.appliesToTakeawayDelivery !== false;
  const appliesToLocalOrders = data.appliesToLocalOrders === true;
  const appliesToCash = data.appliesToCash !== false;
  const appliesToCard = data.appliesToCard !== false;

  if (!name || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    return { error: "Completa el nombre y un periodo de vigencia válido" };
  }

  if (discountType && (!Number.isFinite(discountValue) || discountValue <= 0 || targetProductIds.length === 0)) {
    return { error: "Selecciona productos y un descuento válido" };
  }

  if (!discountType && freeProducts.length === 0) {
    return { error: "Agrega al menos un producto gratuito" };
  }

  if (freeProducts.length > 0 && requiredProducts.length === 0) {
    return { error: "Define los productos requeridos para obtener el regalo" };
  }

  if (!appliesToTakeawayDelivery && !appliesToLocalOrders) {
    return { error: "Selecciona al menos un tipo de pedido donde aplique la promoción" };
  }

  if (!appliesToCash && !appliesToCard) {
    return { error: "Selecciona al menos una forma de pago donde aplique la promoción" };
  }

  return {
    name,
    description: String(data.description ?? "").trim(),
    imageUrl: String(data.imageUrl ?? ""),
    discountType,
    discountValue,
    startsAt,
    endsAt,
    targetProductIds,
    requiredProducts,
    freeProducts,
    appliesToTakeawayDelivery,
    appliesToLocalOrders,
    appliesToCash,
    appliesToCard
  };
}

function normalizeProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((productId) => String(productId ?? "")).filter(Boolean))];
}

function normalizeProductRules(value: unknown): Array<{ productId: string; quantity: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  const rules = new Map<string, number>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const rule = candidate as ProductRuleInput;
    const productId = String(rule.productId ?? "");
    const quantity = Number(rule.quantity ?? 0);

    if (productId && Number.isInteger(quantity) && quantity > 0) {
      rules.set(productId, quantity);
    }
  }

  return Array.from(rules, ([productId, quantity]) => ({ productId, quantity }));
}