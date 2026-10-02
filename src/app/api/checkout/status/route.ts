import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";
import { syncProviderPayment } from "@/src/modules/payments/sync-payment-status";

type SessionUser = { id?: unknown; role?: unknown } | null;

export async function GET(request: Request) {
  const session = (await getCurrentUser()) as SessionUser;
  if (typeof session?.id !== "string" || session.role !== "customer") {
    return NextResponse.json({ error: "Inicia sesión con tu cuenta de cliente." }, { status: 401 });
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") || "";
  const paymentId = url.searchParams.get("paymentId") || undefined;
  const order = await prisma.order.findFirst({
    where: { id: orderId, customer: { userId: session.id } },
    select: { id: true, tenantId: true, paymentStatus: true, paymentProvider: true, paymentMethod: true },
  });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });

  if (order.paymentStatus === "pending" && order.paymentProvider === "clip") {
    await syncProviderPayment({ tenantId: order.tenantId, orderId: order.id, provider: "clip" });
  }
  if (order.paymentStatus === "pending" && order.paymentProvider === "mercadopago" && paymentId) {
    await syncProviderPayment({ tenantId: order.tenantId, orderId: order.id, provider: "mercadopago", providerPaymentId: paymentId });
  }

  const [current, restaurant, transfer] = await Promise.all([
    prisma.order.findUnique({
      where: { id: order.id },
      select: { id: true, orderNumber: true, total: true, paymentStatus: true, paymentMethod: true, status: true },
    }),
    prisma.restaurant.findFirst({ where: { tenantId: order.tenantId }, select: { currency: true } }),
    order.paymentMethod === "transfer"
      ? prisma.businessTransferDetails.findUnique({
          where: { tenantId: order.tenantId },
          select: { enabled: true, bankName: true, accountHolder: true, accountNumber: true, clabe: true, instructions: true },
        })
      : Promise.resolve(null),
  ]);
  return NextResponse.json({ order: current, currency: restaurant?.currency || "MXN", transfer: transfer?.enabled ? transfer : null });
}
