import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { syncSubscriptionPayment } from "@/src/modules/billing/subscription.service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const paymentId = new URL(request.url).searchParams.get("paymentId");
    if (!paymentId) return NextResponse.json({ error: "Pago no válido" }, { status: 400 });

    const payment = await syncSubscriptionPayment({ id: paymentId, tenantId: user.tenantId });
    if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

    return NextResponse.json({ status: payment.status, paidAt: payment.paidAt });
  } catch (error) {
    console.error("Error checking subscription payment:", error);
    return NextResponse.json({ error: "No se pudo validar el pago" }, { status: 500 });
  }
}
