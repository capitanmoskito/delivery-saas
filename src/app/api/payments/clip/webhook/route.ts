import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { syncProviderPayment } from "@/src/modules/payments/sync-payment-status";

export async function POST(request: Request) {
  try {
    const tenantId = new URL(request.url).searchParams.get("tenantId");
    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const paymentRequestId = typeof data.payment_request_id === "string" ? data.payment_request_id : "";
    if (!tenantId || !paymentRequestId) return NextResponse.json({ error: "Notificación no válida." }, { status: 400 });

    const order = await prisma.order.findFirst({
      where: { tenantId, paymentProvider: "clip", externalPaymentId: paymentRequestId },
      select: { id: true },
    });
    if (order) await syncProviderPayment({ tenantId, orderId: order.id, provider: "clip" });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clip webhook error:", error);
    return NextResponse.json({ error: "No se pudo validar la notificación." }, { status: 500 });
  }
}
