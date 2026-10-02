import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

type SessionUser = { id?: unknown } | null;

export async function POST(request: Request) {
  try {
    const session = (await getCurrentUser()) as SessionUser;
    if (typeof session?.id !== "string") {
      return NextResponse.json({ error: "Inicia sesión como cliente para calificar este negocio" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, role: true, firstName: true, lastNamePaternal: true, email: true },
    });
    if (!user || user.role !== "customer") {
      return NextResponse.json({ error: "Solo una cuenta de cliente activa puede enviar reseñas" }, { status: 403 });
    }

    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const tenantId = typeof data.tenantId === "string" ? data.tenantId : "";
    const rating = Number(data.rating);
    const comment = typeof data.comment === "string" ? data.comment.trim() : "";

    if (!tenantId || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 1000) {
      return NextResponse.json({ error: "La calificación no es válida" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { tenantId, active: true },
      select: { tenantId: true },
    });
    if (!restaurant) {
      return NextResponse.json({ error: "El negocio no está disponible" }, { status: 404 });
    }

    const customer = await prisma.customer.upsert({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      create: {
        tenantId,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastNamePaternal,
        email: user.email,
      },
      update: {
        firstName: user.firstName,
        lastName: user.lastNamePaternal,
        email: user.email,
      },
      select: { id: true },
    });
    const customerName = `${user.firstName} ${user.lastNamePaternal}`.trim();
    const review = await prisma.storeReview.create({
      data: { tenantId, customerId: customer.id, rating, comment: comment || null, customerName },
      select: { id: true, rating: true, comment: true, customerName: true, createdAt: true },
    });

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (error) {
    console.error("Store review error:", error);
    return NextResponse.json({ error: "No se pudo guardar la reseña" }, { status: 500 });
  }
}
