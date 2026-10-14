import { NextResponse } from "next/server";

import { syncSubscriptionPayment } from "@/src/modules/billing/subscription.service";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const paymentRequestId = typeof data.payment_request_id === "string" ? data.payment_request_id : "";
    if (!paymentRequestId) return NextResponse.json({ error: "Notificación no válida." }, { status: 400 });

    // The payment is re-verified against Clip's API, so the webhook payload itself is never trusted.
    await syncSubscriptionPayment({ externalPaymentId: paymentRequestId });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clip billing webhook error:", error);
    return NextResponse.json({ error: "No se pudo validar la notificación." }, { status: 500 });
  }
}
