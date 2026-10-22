import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

type SessionUser = { id?: unknown; tenantId?: unknown } | null;

const MAX_MESSAGE_LENGTH = 1000;

async function getTenantId() {
  const user = (await getCurrentUser()) as SessionUser;
  return typeof user?.tenantId === "string" ? user.tenantId : null;
}

export async function GET(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });

  const orderId = new URL(request.url).searchParams.get("orderId") ?? "";
  if (!orderId) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });

  const messages = await prisma.orderMessage.findMany({
    where: { tenantId, orderId },
    orderBy: { createdAt: "asc" },
    select: { id: true, sender: true, body: true, createdAt: true },
  });
  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const orderId = typeof data.orderId === "string" ? data.orderId : "";
  const text = typeof data.body === "string" ? data.body.trim() : "";
  if (!orderId || !text || text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Escribe un mensaje de máximo 1000 caracteres." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId, deliveryConfirmation: "disputed" }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "La mensajería no está habilitada para este pedido." }, { status: 404 });

  const message = await prisma.orderMessage.create({
    data: { tenantId, orderId, sender: "business", body: text },
    select: { id: true, sender: true, body: true, createdAt: true },
  });
  return NextResponse.json(message, { status: 201 });
}
