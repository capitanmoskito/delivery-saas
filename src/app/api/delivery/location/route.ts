import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { isValidDeliveryCode } from "@/src/modules/delivery/delivery-code";
import { clientKey, isBlocked } from "@/src/modules/delivery/rate-limit";

export async function POST(request: Request) {
  if (isBlocked(clientKey(request))) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en unos minutos." }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  const codes = Array.isArray(data.codes) ? data.codes.filter((code): code is string => typeof code === "string" && isValidDeliveryCode(code)).slice(0, 25) : [];

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || codes.length === 0) {
    return NextResponse.json({ error: "Ubicación no válida." }, { status: 400 });
  }

  const result = await prisma.deliveryCode.updateMany({
    where: { activeCode: { in: codes }, expiresAt: { gt: new Date() }, order: { status: "ready_delivery" } },
    data: { driverLatitude: latitude, driverLongitude: longitude, locationUpdatedAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}
