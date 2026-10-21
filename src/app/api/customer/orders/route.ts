import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

type SessionUser = { id?: unknown; role?: unknown } | null;

const LOCATION_FRESH_MS = 2 * 60 * 1000;

export async function GET() {
  const session = (await getCurrentUser()) as SessionUser;
  if (typeof session?.id !== "string" || session.role !== "customer") {
    return NextResponse.json({ error: "Inicia sesión para ver tus pedidos." }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      customer: { userId: session.id },
      OR: [{ status: { in: ["accepted", "preparing", "ready_pickup", "ready_delivery"] } }, { status: "pending_payment", paymentMethod: "transfer" }, { status: "delivered", deliveryConfirmation: { in: ["pending", "disputed"] } }],
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      deliveryCode: { select: { activeCode: true, driverLatitude: true, driverLongitude: true, locationUpdatedAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const tenantIds = [...new Set(orders.map((order) => order.tenantId))];
  const [profiles, restaurants] = await Promise.all([
    prisma.businessProfile.findMany({ where: { tenantId: { in: tenantIds } }, select: { tenantId: true, businessName: true } }),
    prisma.restaurant.findMany({ where: { tenantId: { in: tenantIds } }, select: { id: true, tenantId: true, name: true, currency: true } }),
  ]);
  const now = Date.now();

  return NextResponse.json({
    orders: orders.map((order) => {
      const restaurant = restaurants.find((item) => item.tenantId === order.tenantId);
      const driver = order.status === "ready_delivery" ? order.deliveryCode : null;
      const hasLocation = Boolean(driver?.driverLatitude !== null && driver?.driverLongitude !== null && driver?.locationUpdatedAt);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        readyAt: order.readyAt?.toISOString() ?? null,
        deliveredToName: order.deliveredToName,
        deliveryConfirmation: order.deliveryConfirmation,
        paymentStatus: order.paymentStatus,
        fulfillmentType: order.fulfillmentType,
        total: order.total,
        currency: restaurant?.currency ?? "MXN",
        restaurantId: restaurant?.id ?? null,
        businessName: profiles.find((profile) => profile.tenantId === order.tenantId)?.businessName || restaurant?.name || "",
        deliveryAddress: order.deliveryAddress,
        destination: order.latitude !== null && order.longitude !== null ? { latitude: order.latitude, longitude: order.longitude } : null,
        items: order.items.map((item) => ({ name: item.product.name, quantity: item.quantity })),
        driver: hasLocation && driver
          ? {
              latitude: driver.driverLatitude,
              longitude: driver.driverLongitude,
              updatedAt: driver.locationUpdatedAt?.toISOString(),
              live: now - (driver.locationUpdatedAt?.getTime() ?? 0) < LOCATION_FRESH_MS,
            }
          : null,
      };
    }),
  });
}
