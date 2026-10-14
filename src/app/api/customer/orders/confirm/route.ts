import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

type SessionUser = { id?: unknown; role?: unknown } | null;

export async function POST(request: Request) {
  const session = (await getCurrentUser()) as SessionUser;
  if (typeof session?.id !== "string" || session.role !== "customer") {
    return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const orderId = typeof data.orderId === "string" ? data.orderId : "";
  const received = data.received === true;
  if (!orderId || typeof data.received !== "boolean") return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });

  const result = await prisma.order.updateMany({
    where: { id: orderId, customer: { userId: session.id }, status: "delivered", deliveryConfirmation: { in: ["pending", "disputed"] } },
    data: { deliveryConfirmation: received ? "confirmed" : "disputed", deliveryConfirmedAt: received ? new Date() : null },
  });
  if (result.count !== 1) return NextResponse.json({ error: "No se encontró el pedido." }, { status: 404 });

  return NextResponse.json({ success: true });
}
