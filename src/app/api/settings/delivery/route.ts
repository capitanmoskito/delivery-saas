import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";
import { defaultDeliverySettings, type DeliveryFeeSettings } from "@/src/modules/delivery/delivery-fee";

type SessionUser = { id?: unknown; tenantId?: unknown } | null;

const MAX_AMOUNT = 100000;

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= MAX_AMOUNT ? Math.round(amount * 100) / 100 : null;
}

function toSettings(record: { pickupEnabled: boolean; deliveryEnabled: boolean; feeType: string; fixedFee: number; perKmFee: number; maxDistanceKm: number | null }): DeliveryFeeSettings {
  return {
    pickupEnabled: record.pickupEnabled,
    deliveryEnabled: record.deliveryEnabled,
    feeType: record.feeType === "per_km" ? "per_km" : "fixed",
    fixedFee: record.fixedFee,
    perKmFee: record.perKmFee,
    maxDistanceKm: record.maxDistanceKm,
  };
}

export async function GET() {
  const session = (await getCurrentUser()) as SessionUser;
  if (typeof session?.tenantId !== "string") return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });

  const record = await prisma.businessDeliverySettings.findUnique({ where: { tenantId: session.tenantId } });
  return NextResponse.json(record ? toSettings(record) : defaultDeliverySettings);
}

export async function POST(request: Request) {
  try {
    const session = (await getCurrentUser()) as SessionUser;
    if (typeof session?.id !== "string" || typeof session.tenantId !== "string") {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }
    const { id: userId, tenantId } = session;

    const editSession = await prisma.settingsEditSession.findFirst({
      where: { tenantId, userId, active: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!editSession) return NextResponse.json({ error: "Valida el código OTP antes de guardar la configuración." }, { status: 403 });

    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const feeType = data.feeType === "per_km" ? "per_km" : "fixed";
    const fixedFee = toAmount(data.fixedFee ?? 0);
    const perKmFee = toAmount(data.perKmFee ?? 0);
    const maxDistanceRaw = data.maxDistanceKm === null || data.maxDistanceKm === undefined || data.maxDistanceKm === "" ? null : Number(data.maxDistanceKm);
    if (fixedFee === null || perKmFee === null) {
      return NextResponse.json({ error: "Los montos de envío deben ser números válidos mayores o iguales a 0." }, { status: 400 });
    }
    if (maxDistanceRaw !== null && (!Number.isFinite(maxDistanceRaw) || maxDistanceRaw <= 0 || maxDistanceRaw > 500)) {
      return NextResponse.json({ error: "La distancia máxima debe ser mayor a 0 y menor a 500 km." }, { status: 400 });
    }

    const next: DeliveryFeeSettings = {
      pickupEnabled: data.pickupEnabled !== false,
      deliveryEnabled: data.deliveryEnabled === true,
      feeType,
      fixedFee,
      perKmFee,
      maxDistanceKm: maxDistanceRaw,
    };
    if (!next.pickupEnabled && !next.deliveryEnabled) {
      return NextResponse.json({ error: "Habilita al menos recolección en tienda o envío a domicilio." }, { status: 400 });
    }
    if (next.deliveryEnabled && feeType === "per_km" && perKmFee <= 0) {
      return NextResponse.json({ error: "Indica el costo por kilómetro." }, { status: 400 });
    }

    if (next.deliveryEnabled && (feeType === "per_km" || next.maxDistanceKm !== null)) {
      const profile = await prisma.businessProfile.findUnique({ where: { tenantId }, select: { latitude: true, longitude: true } });
      if (profile?.latitude == null || profile.longitude == null) {
        return NextResponse.json({ error: "Marca la ubicación de tu negocio en el mapa antes de cobrar el envío por kilómetro." }, { status: 400 });
      }
    }

    const previous = await prisma.businessDeliverySettings.findUnique({ where: { tenantId } });
    await prisma.$transaction(async (transaction) => {
      await transaction.businessDeliverySettings.upsert({
        where: { tenantId },
        create: { tenantId, ...next },
        update: next,
      });
      await transaction.businessConfigurationAudit.create({
        data: {
          tenantId,
          userId,
          fieldName: "Envíos y recolección",
          previousValue: JSON.stringify(previous ? toSettings(previous) : defaultDeliverySettings),
          newValue: JSON.stringify(next),
        },
      });
      await transaction.settingsEditSession.update({ where: { id: editSession.id }, data: { active: false } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delivery settings update error:", error);
    return NextResponse.json({ error: "No se pudo guardar la configuración de envíos." }, { status: 500 });
  }
}
