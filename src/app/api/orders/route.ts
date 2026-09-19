import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

const orderStatuses = ["accepted", "preparing", "ready_pickup", "ready_delivery", "delivered"] as const;
type OrderStatus = typeof orderStatuses[number];

type OrderItemInput = {
  productId?: unknown;
  quantity?: unknown;
  additionIds?: unknown;
};

type PackageInput = {
  packageId?: unknown;
  quantity?: unknown;
  complementIds?: unknown;
};

type NormalizedOrderItem = {
  productId: string;
  quantity: number;
  additionIds: string[];
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { tenantId: user.tenantId },
      include: {
        customer: true,
        items: { include: { product: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "No se pudieron cargar los pedidos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Orden no válida" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const source = String(data.source ?? "local");
    const fulfillmentType = String(data.fulfillmentType ?? "pickup");
    const customerName = String(data.customerName ?? "").trim();
    const tableNumber = String(data.tableNumber ?? "").trim();
    const deliveryAddress = String(data.deliveryAddress ?? "").trim();
    const postalCode = String(data.postalCode ?? "").trim();
    const neighborhood = String(data.neighborhood ?? "").trim();
    const city = String(data.city ?? "").trim();
    const state = String(data.state ?? "").trim();
    const deliveryReference = String(data.deliveryReference ?? "").trim();
    const contactPhone = String(data.contactPhone ?? "").trim();
    const latitude = data.latitude === null || data.latitude === undefined || data.latitude === "" ? null : Number(data.latitude);
    const longitude = data.longitude === null || data.longitude === undefined || data.longitude === "" ? null : Number(data.longitude);
    const requestedItems = normalizeItems(data.items);
    const packageSelections = normalizePackages(data.packages);
    const selectedPromotionIds = normalizeIds(data.promotionIds);
    const paymentMethod = String(data.paymentMethod ?? "cash");

    if (source !== "local" && source !== "online") {
      return NextResponse.json({ error: "Origen de pedido no válido" }, { status: 400 });
    }

    if (fulfillmentType !== "pickup" && fulfillmentType !== "delivery" && fulfillmentType !== "dine_in") {
      return NextResponse.json({ error: "Tipo de entrega no válido" }, { status: 400 });
    }

    if (paymentMethod !== "cash" && paymentMethod !== "card") {
      return NextResponse.json({ error: "Forma de pago no válida" }, { status: 400 });
    }

    if (fulfillmentType === "dine_in" && !tableNumber) {
      return NextResponse.json({ error: "Indica la mesa para consumo en local" }, { status: 400 });
    }

    if (fulfillmentType !== "dine_in" && !customerName) {
      return NextResponse.json({ error: "Indica una mesa o el nombre del cliente" }, { status: 400 });
    }

    if (fulfillmentType === "delivery" && !deliveryAddress) {
      return NextResponse.json({ error: "La dirección es obligatoria para envío" }, { status: 400 });
    }

    if ((latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) {
      return NextResponse.json({ error: "Las coordenadas no son válidas" }, { status: 400 });
    }

    if (requestedItems.length === 0 && packageSelections.length === 0) {
      return NextResponse.json({ error: "Agrega al menos un producto" }, { status: 400 });
    }

    const packages = packageSelections.length > 0
      ? await prisma.package.findMany({
          where: { tenantId: user.tenantId, active: true, id: { in: packageSelections.map((item) => item.packageId) } },
          include: {
            items: true,
            complements: {
              where: { active: true }
            }
          }
        })
      : [];

    if (packages.length !== packageSelections.length) {
      return NextResponse.json({ error: "Uno o más paquetes no están disponibles" }, { status: 400 });
    }

    const itemsByProduct = new Map(requestedItems.map((item) => [item.productId, item]));
    for (const packageSelection of packageSelections) {
      const selectedPackage = packages.find((item) => item.id === packageSelection.packageId);
      for (const packageItem of selectedPackage?.items || []) {
        const current = itemsByProduct.get(packageItem.productId);
        itemsByProduct.set(packageItem.productId, {
          productId: packageItem.productId,
          quantity: (current?.quantity || 0) + packageItem.quantity * packageSelection.quantity,
          additionIds: current?.additionIds || []
        });
      }
    }
    const items = Array.from(itemsByProduct.values());

    const products = await prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        active: true,
        id: { in: items.map((item) => item.productId) }
      },
      include: {
        variants: {
          where: { active: true },
          select: { id: true, name: true, price: true }
        }
      }
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    if (productsById.size !== items.length) {
      return NextResponse.json({ error: "Uno o más productos no están disponibles" }, { status: 400 });
    }

    const orderItems = items.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new Error("Producto no disponible");
      }

      const variantsById = new Map(product.variants.map((variant) => [variant.id, variant]));
      const additions = item.additionIds.map((additionId) => variantsById.get(additionId)).filter((addition) => addition !== undefined);

      if (additions.length !== item.additionIds.length) {
        throw new Error("Adicional no válido");
      }

      const additionsTotal = additions.reduce((total, addition) => total + addition.price, 0);
      const unitPrice = product.price + additionsTotal;

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        additions: additions.map((addition) => ({ id: addition.id, name: addition.name, price: addition.price }))
      };
    });
    const productSubtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);
    const packageRegularTotal = packageSelections.reduce((total, selection) => {
      const selectedPackage = packages.find((item) => item.id === selection.packageId);
      return total + (selectedPackage?.items.reduce((packageTotal, item) => packageTotal + (productsById.get(item.productId)?.price || 0) * item.quantity, 0) || 0) * selection.quantity;
    }, 0);
    const packageSpecialTotal = packageSelections.reduce((total, selection) => {
      const selectedPackage = packages.find((item) => item.id === selection.packageId);
      const complements = selectedPackage?.complements.filter((complement) => selection.complementIds.includes(complement.id)) || [];

      if (complements.length !== selection.complementIds.length) {
        throw new Error("Complemento de paquete no válido");
      }

      const complementsTotal = complements.reduce((complementTotal, complement) => complementTotal + complement.price, 0);
      return total + ((selectedPackage?.price || 0) + complementsTotal) * selection.quantity;
    }, 0);
    const subtotal = productSubtotal - packageRegularTotal + packageSpecialTotal;
    const promotions = selectedPromotionIds.length > 0 ? await prisma.businessPromotion.findMany({
      where: { id: { in: selectedPromotionIds }, tenantId: user.tenantId, active: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
      include: { targetProducts: true, requiredProducts: true }
    }) : [];
    const quantities = new Map(items.map((item) => [item.productId, item.quantity]));
    const discountEntries = promotions.flatMap((promotion) => {
      const allowedOrder = source === "local" ? promotion.appliesToLocalOrders : promotion.appliesToTakeawayDelivery;
      const allowedPayment = paymentMethod === "cash" ? promotion.appliesToCash : promotion.appliesToCard;
      const requirementsMet = promotion.requiredProducts.every((item) => (quantities.get(item.productId) || 0) >= item.quantity);
      if (!allowedOrder || !allowedPayment || !requirementsMet) return [];
      const targetSubtotal = promotion.targetProducts.reduce((total, target) => total + (productsById.get(target.productId)?.price || 0) * (quantities.get(target.productId) || 0), 0);
      const discount = promotion.discountType === "percentage" ? targetSubtotal * ((promotion.discountPercent || 0) / 100) : promotion.discountType === "fixed_amount" ? Math.min(targetSubtotal, promotion.discountAmount || 0) : 0;
      return discount > 0 ? [{ id: promotion.id, name: promotion.name, discount }] : [];
    });
    const discountTotal = Math.min(subtotal, discountEntries.reduce((total, item) => total + item.discount, 0));
    const displayName = customerName || `Mesa ${tableNumber}`;
    const orderNumber = `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    const order = await prisma.$transaction(async (transaction) => {
      const customer = await transaction.customer.create({
        data: {
          tenantId: user.tenantId,
          firstName: displayName,
          lastName: "",
          email: `local-${crypto.randomUUID()}@orders.local`
        }
      });

      return transaction.order.create({
        data: {
          tenantId: user.tenantId,
          customerId: customer.id,
          orderNumber,
          source,
          fulfillmentType,
          paymentMethod,
          paymentStatus: fulfillmentType === "delivery" ? "paid" : "pending",
          customerName: displayName,
          tableNumber: tableNumber || null,
          deliveryAddress: deliveryAddress || null,
          postalCode: postalCode || null,
          neighborhood: neighborhood || null,
          city: city || null,
          state: state || null,
          deliveryReference: deliveryReference || null,
          contactPhone: contactPhone || null,
          latitude,
          longitude,
          status: source === "local" ? "preparing" : "accepted",
          acceptedAt: source === "online" ? new Date() : null,
          preparingAt: source === "local" ? new Date() : null,
          subtotal,
          discountTotal,
          appliedPromotions: discountEntries,
          total: Math.max(0, subtotal - discountTotal),
          items: { create: orderItems }
        },
        include: {
          customer: true,
          items: { include: { product: true } }
        }
      });
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    const message = error instanceof Error && error.message === "Adicional no válido"
      ? error.message
      : "No se pudo crear la orden";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Orden no válida" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const orderId = String(data.id ?? "");
    const status = data.status === undefined ? undefined : String(data.status) as OrderStatus;
    const paymentStatus = data.paymentStatus === undefined ? undefined : String(data.paymentStatus);
    const items = data.items === undefined ? undefined : normalizeItems(data.items);
    const deliveryAddress = data.deliveryAddress === undefined ? undefined : String(data.deliveryAddress ?? "").trim();
    const postalCode = data.postalCode === undefined ? undefined : String(data.postalCode ?? "").trim();
    const neighborhood = data.neighborhood === undefined ? undefined : String(data.neighborhood ?? "").trim();
    const city = data.city === undefined ? undefined : String(data.city ?? "").trim();
    const state = data.state === undefined ? undefined : String(data.state ?? "").trim();
    const deliveryReference = data.deliveryReference === undefined ? undefined : String(data.deliveryReference ?? "").trim();
    const contactPhone = data.contactPhone === undefined ? undefined : String(data.contactPhone ?? "").trim();
    const latitude = data.latitude === undefined ? undefined : data.latitude === null || data.latitude === "" ? null : Number(data.latitude);
    const longitude = data.longitude === undefined ? undefined : data.longitude === null || data.longitude === "" ? null : Number(data.longitude);

    if (!orderId || (status !== undefined && !orderStatuses.includes(status)) || (paymentStatus !== undefined && paymentStatus !== "paid" && paymentStatus !== "pending")) {
      return NextResponse.json({ error: "Actualización no válida" }, { status: 400 });
    }

    if ((latitude !== undefined && latitude !== null && !Number.isFinite(latitude)) || (longitude !== undefined && longitude !== null && !Number.isFinite(longitude))) {
      return NextResponse.json({ error: "Las coordenadas no son válidas" }, { status: 400 });
    }

    const existingOrder = await prisma.order.findFirst({
      where: { id: orderId, tenantId: user.tenantId },
      include: { items: true }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (
      existingOrder.source === "local" &&
      ((status !== undefined && status !== "preparing" && status !== "delivered" && !(existingOrder.fulfillmentType === "pickup" && status === "ready_pickup") && !(existingOrder.fulfillmentType === "delivery" && status === "ready_delivery")) ||
        (paymentStatus === "paid" && status !== "delivered" && existingOrder.status !== "delivered"))
    ) {
      return NextResponse.json({ error: "Flujo de pedido local no válido" }, { status: 400 });
    }

    if (items !== undefined) {
      if (existingOrder.source !== "local" || (existingOrder.status === "delivered" && existingOrder.paymentStatus === "paid") || items.length === 0) {
        return NextResponse.json({ error: "La orden ya no se puede editar" }, { status: 400 });
      }

      const products = await prisma.product.findMany({
        where: { tenantId: user.tenantId, active: true, id: { in: items.map((item) => item.productId) } },
        include: { variants: { where: { active: true }, select: { id: true, name: true, price: true } } }
      });
      const productsById = new Map(products.map((product) => [product.id, product]));

      if (productsById.size !== items.length) {
        return NextResponse.json({ error: "Uno o más productos no están disponibles" }, { status: 400 });
      }

      const orderItems = items.map((item) => {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new Error("Producto no disponible");
        }

        const variantsById = new Map(product.variants.map((variant) => [variant.id, variant]));
        const additions = item.additionIds.map((additionId) => variantsById.get(additionId)).filter((addition) => addition !== undefined);

        if (additions.length !== item.additionIds.length) {
          throw new Error("Adicional no válido");
        }

        const unitPrice = product.price + additions.reduce((total, addition) => total + addition.price, 0);
        return { productId: product.id, quantity: item.quantity, unitPrice, totalPrice: unitPrice * item.quantity, additions: additions.map((addition) => ({ id: addition.id, name: addition.name, price: addition.price })) };
      });
      const subtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);

      await prisma.$transaction(async (transaction) => {
        await transaction.orderItem.deleteMany({ where: { orderId } });
        await transaction.orderItem.createMany({
          data: orderItems.map((item) => ({ orderId, ...item }))
        });
        await transaction.order.update({
          where: { id: orderId },
          data: {
            subtotal,
            total: subtotal,
            status: "preparing",
            preparingAt: new Date(),
            readyAt: null,
            ...(deliveryAddress === undefined ? {} : { deliveryAddress: deliveryAddress || null }),
            ...(postalCode === undefined ? {} : { postalCode: postalCode || null }),
            ...(neighborhood === undefined ? {} : { neighborhood: neighborhood || null }),
            ...(city === undefined ? {} : { city: city || null }),
            ...(state === undefined ? {} : { state: state || null }),
            ...(deliveryReference === undefined ? {} : { deliveryReference: deliveryReference || null }),
            ...(contactPhone === undefined ? {} : { contactPhone: contactPhone || null }),
            ...(latitude === undefined ? {} : { latitude }),
            ...(longitude === undefined ? {} : { longitude }),
            ...(paymentStatus === undefined ? {} : { paymentStatus })
          }
        });
      });

      return NextResponse.json({ success: true });
    }

    const result = await prisma.order.updateMany({
      where: { id: orderId, tenantId: user.tenantId },
      data: {
        ...(status === undefined ? {} : { status }),
        ...(status === "accepted" ? { acceptedAt: new Date() } : {}),
        ...(status === "preparing" ? { preparingAt: new Date(), readyAt: null } : {}),
        ...(status === "ready_pickup" || status === "ready_delivery" ? { readyAt: new Date() } : {}),
        ...(paymentStatus === "paid" ? { paidAt: new Date() } : {}),
        ...(paymentStatus === undefined ? {} : { paymentStatus })
      }
    });

    if (!result.count) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "No se pudo actualizar el pedido" }, { status: 500 });
  }
}

function normalizeItems(value: unknown): NormalizedOrderItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items = new Map<string, NormalizedOrderItem>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const item = candidate as OrderItemInput;
    const productId = String(item.productId ?? "");
    const quantity = Number(item.quantity ?? 0);
    const additionIds = Array.isArray(item.additionIds)
      ? [...new Set(item.additionIds.map((additionId) => String(additionId ?? "")).filter(Boolean))]
      : [];

    if (productId && Number.isInteger(quantity) && quantity > 0) {
      items.set(productId, { productId, quantity, additionIds });
    }
  }

  return Array.from(items.values());
}

function normalizePackages(value: unknown): Array<{ packageId: string; quantity: number; complementIds: string[] }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as PackageInput;
    const packageId = String(item.packageId ?? "");
    const quantity = Number(item.quantity ?? 0);
    const complementIds = Array.isArray(item.complementIds)
      ? [...new Set(item.complementIds.map((complementId) => String(complementId ?? "")).filter(Boolean))]
      : [];
    return packageId && Number.isInteger(quantity) && quantity > 0 ? [{ packageId, quantity, complementIds }] : [];
  });
}

function normalizeIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.map((item) => String(item ?? "")).filter(Boolean))] : [];
}