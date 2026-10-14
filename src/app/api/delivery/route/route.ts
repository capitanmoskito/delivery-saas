import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { isValidDeliveryCode } from "@/src/modules/delivery/delivery-code";
import { clientKey, isBlocked, registerFailures } from "@/src/modules/delivery/rate-limit";
import type { DeliveryStop } from "@/src/modules/delivery/types";
import { planRoute, type Coordinates } from "@/src/modules/delivery/route-optimizer";

const MAX_CODES = 25;

function parseOrigin(value: unknown): Coordinates | null {
  if (!value || typeof value !== "object") return null;
  const { latitude, longitude } = value as Record<string, unknown>;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export async function POST(request: Request) {
  const key = clientKey(request);
  if (isBlocked(key)) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en unos minutos." }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const codes = Array.isArray(data.codes)
    ? [...new Set(data.codes.filter((code): code is string => typeof code === "string" && isValidDeliveryCode(code)))].slice(0, MAX_CODES)
    : [];
  if (codes.length === 0) return NextResponse.json({ stops: [], pickups: [], invalidCodes: [], distanceKm: 0 });

  const deliveryCodes = await prisma.deliveryCode.findMany({
    where: { activeCode: { in: codes }, expiresAt: { gt: new Date() }, order: { status: "ready_delivery" } },
    include: { order: { include: { items: { include: { product: { select: { name: true } } } } } } },
  });

  const foundCodes = new Set(deliveryCodes.map((deliveryCode) => deliveryCode.code));
  const invalidCodes = codes.filter((code) => !foundCodes.has(code));
  registerFailures(key, invalidCodes.length);

  const tenantIds = [...new Set(deliveryCodes.map((deliveryCode) => deliveryCode.tenantId))];
  const profiles = await prisma.businessProfile.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { tenantId: true, businessName: true, addressLine: true, neighborhood: true, city: true, latitude: true, longitude: true },
  });
  const profilesByTenant = new Map(profiles.map((profile) => [profile.tenantId, profile]));

  const pickups = profiles.flatMap((profile) =>
    profile.latitude !== null && profile.longitude !== null
      ? [{ tenantId: profile.tenantId, latitude: profile.latitude, longitude: profile.longitude }]
      : [],
  );
  const plan = planRoute({
    start: parseOrigin(data.origin),
    pickups,
    drops: deliveryCodes.map((deliveryCode) => ({
      id: deliveryCode.id,
      tenantId: deliveryCode.tenantId,
      latitude: deliveryCode.order.latitude,
      longitude: deliveryCode.order.longitude,
    })),
  });

  const byId = new Map(deliveryCodes.map((deliveryCode) => [deliveryCode.id, deliveryCode]));
  const steps = plan.steps.flatMap((step): DeliveryStop[] => {
    if (step.type === "pickup") {
      const profile = profilesByTenant.get(step.tenantId);
      return profile
        ? [{
            type: "pickup",
            tenantId: profile.tenantId,
            businessName: profile.businessName,
            address: [profile.addressLine, profile.neighborhood, profile.city].filter(Boolean).join(", "),
            latitude: profile.latitude,
            longitude: profile.longitude,
          }]
        : [];
    }
    const deliveryCode = byId.get(step.id);
    if (!deliveryCode) return [];
    const { order } = deliveryCode;
    return [{
      type: "drop",
      code: deliveryCode.code,
      tenantId: deliveryCode.tenantId,
      businessName: profilesByTenant.get(deliveryCode.tenantId)?.businessName ?? "",
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      address: [order.deliveryAddress, order.neighborhood, order.city].filter(Boolean).join(", "),
      reference: order.deliveryReference,
      phone: order.contactPhone,
      latitude: order.latitude,
      longitude: order.longitude,
      total: order.total,
      paymentStatus: order.paymentStatus,
      startedAt: (order.acceptedAt ?? order.createdAt).toISOString(),
      items: order.items.map((item) => ({ name: item.product.name, quantity: item.quantity })),
    }];
  });

  return NextResponse.json({ steps, invalidCodes, distanceKm: plan.distanceKm });
}
