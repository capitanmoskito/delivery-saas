import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id || user.role !== "customer") {
    return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { firstName: true, lastNamePaternal: true, email: true, customerAddresses: { orderBy: { updatedAt: "desc" }, take: 1 } }
  });

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.id || user.role !== "customer") {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const firstName = String(data.firstName ?? "").trim();
    const lastName = String(data.lastName ?? "").trim();
    const street = String(data.street ?? "").trim();
    const postalCode = String(data.postalCode ?? "").trim();
    const neighborhood = String(data.neighborhood ?? "").trim();
    const city = String(data.city ?? "").trim();
    const state = String(data.state ?? "").trim();
    const latitude = data.latitude === null || data.latitude === undefined ? null : Number(data.latitude);
    const longitude = data.longitude === null || data.longitude === undefined ? null : Number(data.longitude);

    if (!firstName || !lastName || !street || !postalCode || !neighborhood || !city || !state) {
      return NextResponse.json({ error: "Completa todos los datos de perfil y dirección" }, { status: 400 });
    }

    if ((latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) {
      return NextResponse.json({ error: "Coordenadas no válidas" }, { status: 400 });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: user.id }, data: { firstName, lastNamePaternal: lastName } });
      const address = await transaction.customerAddress.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true } });
      const addressData = { street, postalCode, neighborhood, city, state, country: String(data.country ?? "México"), reference: String(data.reference ?? "").trim() || null, contactPhone: String(data.contactPhone ?? "").trim() || null, latitude, longitude };
      if (address) await transaction.customerAddress.update({ where: { id: address.id }, data: addressData });
      else await transaction.customerAddress.create({ data: { userId: user.id, ...addressData } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer profile error:", error);
    return NextResponse.json({ error: "No se pudo guardar el perfil" }, { status: 500 });
  }
}