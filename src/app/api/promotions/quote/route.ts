import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";

type CartItemInput = {
  productId?: unknown;
  quantity?: unknown;
};

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Carrito no válido" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const tenantId = String(data.tenantId ?? "");
    const items = normalizeCartItems(data.items);

    if (!tenantId || items.length === 0) {
      return NextResponse.json({ error: "Carrito no válido" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { tenantId, active: true, id: { in: items.map((item) => item.productId) } },
      select: { id: true, name: true, price: true }
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    if (productsById.size !== items.length) {
      return NextResponse.json({ error: "El carrito contiene productos no disponibles" }, { status: 400 });
    }

    const quantities = new Map(items.map((item) => [item.productId, item.quantity]));
    const subtotal = items.reduce((total, item) => total + (productsById.get(item.productId)?.price || 0) * item.quantity, 0);
    const now = new Date();
    const promotions = await prisma.businessPromotion.findMany({
      where: {
        tenantId,
        active: true,
        startsAt: { lte: now },
        endsAt: { gte: now }
      },
      include: {
        targetProducts: true,
        requiredProducts: true,
        freeProducts: { include: { product: true } }
      }
    });

    let discountTotal = 0;
    const appliedPromotions: Array<{ id: string; name: string; discount: number }> = [];
    const freeItems: Array<{ promotionId: string; productId: string; name: string; quantity: number }> = [];

    for (const promotion of promotions) {
      const requirementsMet = promotion.requiredProducts.every((requirement) =>
        (quantities.get(requirement.productId) || 0) >= requirement.quantity
      );

      if (!requirementsMet) {
        continue;
      }

      let discount = 0;

      if (promotion.discountType && promotion.targetProducts.length > 0) {
        const targetSubtotal = promotion.targetProducts.reduce((total, target) => {
          const product = productsById.get(target.productId);
          return total + (product?.price || 0) * (quantities.get(target.productId) || 0);
        }, 0);

        if (promotion.discountType === "percentage") {
          discount = targetSubtotal * ((promotion.discountPercent || 0) / 100);
        } else {
          discount = Math.min(targetSubtotal, promotion.discountAmount || 0);
        }
      }

      if (discount > 0) {
        discountTotal += discount;
        appliedPromotions.push({ id: promotion.id, name: promotion.name, discount });
      }

      for (const freeProduct of promotion.freeProducts) {
        freeItems.push({
          promotionId: promotion.id,
          productId: freeProduct.productId,
          name: freeProduct.product.name,
          quantity: freeProduct.quantity
        });
      }
    }

    return NextResponse.json({
      subtotal,
      discountTotal: Math.min(discountTotal, subtotal),
      total: Math.max(0, subtotal - discountTotal),
      appliedPromotions,
      freeItems
    });
  } catch (error) {
    console.error("Error quoting promotions:", error);
    return NextResponse.json({ error: "No se pudieron calcular las promociones" }, { status: 500 });
  }
}

function normalizeCartItems(value: unknown): Array<{ productId: string; quantity: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  const items = new Map<string, number>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const item = candidate as CartItemInput;
    const productId = String(item.productId ?? "");
    const quantity = Number(item.quantity ?? 0);

    if (productId && Number.isInteger(quantity) && quantity > 0) {
      items.set(productId, quantity);
    }
  }

  return Array.from(items, ([productId, quantity]) => ({ productId, quantity }));
}