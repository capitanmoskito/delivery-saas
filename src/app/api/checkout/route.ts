import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

type CartItem = { productId?: unknown; quantity?: unknown; additionIds?: unknown };

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.id || user.role !== "customer") return NextResponse.json({ error: "Inicia sesión para pagar" }, { status: 401 });

    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const restaurantId = String(data.restaurantId ?? "");
    const items = normalizeItems(data.items);

    if (!restaurantId || !items.length) return NextResponse.json({ error: "Carrito no válido" }, { status: 400 });

    const [restaurant, address, userProfile] = await Promise.all([
      prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { tenantId: true } }),
      prisma.customerAddress.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
      prisma.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastNamePaternal: true, email: true } })
    ]);

    if (!restaurant || !address || !userProfile) return NextResponse.json({ error: "Completa tu perfil y dirección antes de pagar" }, { status: 400 });

    const products = await prisma.product.findMany({ where: { tenantId: restaurant.tenantId, active: true, id: { in: items.map((item) => item.productId) } }, include: { variants: { where: { active: true }, select: { id: true, name: true, price: true } } } });
    const productsById = new Map(products.map((product) => [product.id, product]));
    if (productsById.size !== items.length) return NextResponse.json({ error: "Uno o más productos ya no están disponibles" }, { status: 400 });

    const orderItems = items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) throw new Error("Producto no disponible");
      const variants = new Map(product.variants.map((variant) => [variant.id, variant]));
      const additions = item.additionIds.map((id) => variants.get(id)).filter((variant) => variant !== undefined);
      if (additions.length !== item.additionIds.length) throw new Error("Adicional no válido");
      const unitPrice = product.price + additions.reduce((total, variant) => total + variant.price, 0);
      return { productId: product.id, quantity: item.quantity, unitPrice, totalPrice: unitPrice * item.quantity, additions: additions.map((variant) => ({ id: variant.id, name: variant.name, price: variant.price })) };
    });
    const subtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);

    const order = await prisma.$transaction(async (transaction) => {
      const customer = await transaction.customer.upsert({
        where: { tenantId_userId: { tenantId: restaurant.tenantId, userId: user.id } },
        create: { tenantId: restaurant.tenantId, userId: user.id, firstName: userProfile.firstName, lastName: userProfile.lastNamePaternal, email: userProfile.email, phone: address.contactPhone },
        update: { firstName: userProfile.firstName, lastName: userProfile.lastNamePaternal, phone: address.contactPhone }
      });
      return transaction.order.create({
        data: { tenantId: restaurant.tenantId, customerId: customer.id, orderNumber: `WEB-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, source: "online", fulfillmentType: "delivery", paymentMethod: "card", paymentStatus: "paid", customerName: `${userProfile.firstName} ${userProfile.lastNamePaternal}`, deliveryAddress: address.street, postalCode: address.postalCode, neighborhood: address.neighborhood, city: address.city, state: address.state, deliveryReference: address.reference, contactPhone: address.contactPhone, latitude: address.latitude, longitude: address.longitude, status: "accepted", acceptedAt: new Date(), subtotal, total: subtotal, items: { create: orderItems } },
        select: { id: true, orderNumber: true, total: true }
      });
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "No se pudo procesar el pago" }, { status: 500 });
  }
}

function normalizeItems(value: unknown): Array<{ productId: string; quantity: number; additionIds: string[] }> {
  if (!Array.isArray(value)) return [];
  const items = new Map<string, { productId: string; quantity: number; additionIds: string[] }>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as CartItem;
    const productId = String(item.productId ?? "");
    const quantity = Number(item.quantity ?? 0);
    const additionIds = Array.isArray(item.additionIds) ? [...new Set(item.additionIds.map((id) => String(id ?? "")).filter(Boolean))] : [];
    if (productId && Number.isInteger(quantity) && quantity > 0) items.set(productId, { productId, quantity, additionIds });
  }
  return Array.from(items.values());
}