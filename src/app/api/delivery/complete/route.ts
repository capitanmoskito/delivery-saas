import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { isValidDeliveryCode, releaseDeliveryCode } from "@/src/modules/delivery/delivery-code";
import { clientKey, isBlocked, registerFailures } from "@/src/modules/delivery/rate-limit";

export async function POST(request: Request) {
  const key = clientKey(request);
  if (isBlocked(key)) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo en unos minutos." }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = String(data.code ?? "");
  const recipientName = String(data.recipientName ?? "").replace(/\s+/g, " ").trim();
  if (!isValidDeliveryCode(code)) return NextResponse.json({ error: "Código no válido." }, { status: 400 });
  if (recipientName.length < 2 || recipientName.length > 80) return NextResponse.json({ error: "Indica el nombre de quien recibe." }, { status: 400 });

  const deliveryCode = await prisma.deliveryCode.findFirst({
    where: { activeCode: code, expiresAt: { gt: new Date() }, order: { status: "ready_delivery" } },
    select: { orderId: true, tenantId: true },
  });
  if (!deliveryCode) {
    registerFailures(key, 1);
    return NextResponse.json({ error: "Código no válido o vencido." }, { status: 404 });
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.order.updateMany({
      where: { id: deliveryCode.orderId, tenantId: deliveryCode.tenantId, status: "ready_delivery" },
      data: { status: "delivered", deliveredToName: recipientName, deliveryConfirmation: "pending", deliveryConfirmedAt: null },
    });
    await releaseDeliveryCode(transaction, deliveryCode.orderId);
  });

  return NextResponse.json({ success: true });
}
