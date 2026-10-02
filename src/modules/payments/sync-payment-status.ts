import { decryptPaymentCredentials } from "@/src/lib/payment-credentials";
import { prisma } from "@/src/lib/prisma";
import type { PaymentProviderName } from "@/src/modules/payments/payment-provider.factory";

function sameAmount(left: number, right: number) {
  return Math.round(left * 100) === Math.round(right * 100);
}

export async function syncProviderPayment({
  tenantId,
  orderId,
  provider,
  providerPaymentId,
}: {
  tenantId: string;
  orderId: string;
  provider: PaymentProviderName;
  providerPaymentId?: string;
}) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, paymentProvider: provider },
    select: { id: true, tenantId: true, paymentStatus: true, total: true, externalPaymentId: true },
  });
  if (!order) return { found: false, paid: false };
  if (order.paymentStatus === "paid") return { found: true, paid: true };

  const config = await prisma.paymentProviderConfig.findUnique({ where: { tenantId_provider: { tenantId, provider } } });
  if (!config) return { found: true, paid: false };
  const credentials = decryptPaymentCredentials(config.credentialsEncrypted);
  let confirmed = false;

  if (provider === "mercadopago") {
    const accessToken = credentials.mercadoPagoAccessToken;
    if (!accessToken || !providerPaymentId) return { found: true, paid: false };
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(providerPaymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { found: true, paid: false };
    const payment: { status?: string; external_reference?: string; transaction_amount?: number; currency_id?: string } = await response.json();
    const restaurant = await prisma.restaurant.findFirst({ where: { tenantId }, select: { currency: true } });
    confirmed = payment.status === "approved"
      && payment.external_reference === orderId
      && typeof payment.transaction_amount === "number"
      && sameAmount(payment.transaction_amount, order.total)
      && (!payment.currency_id || payment.currency_id === restaurant?.currency);
  } else {
    const apiKey = credentials.clipApiKey;
    const apiSecret = credentials.clipApiSecret;
    if (!apiKey || !apiSecret || !order.externalPaymentId) return { found: true, paid: false };
    const authorization = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
    const response = await fetch(`https://api.payclip.com/v2/checkout/${encodeURIComponent(order.externalPaymentId)}`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { found: true, paid: false };
    const payment: { status?: string; amount?: number; currency?: string; metadata?: { external_reference?: string } } = await response.json();
    const restaurant = await prisma.restaurant.findFirst({ where: { tenantId }, select: { currency: true } });
    confirmed = payment.status === "CHECKOUT_COMPLETED"
      && payment.metadata?.external_reference === orderId
      && typeof payment.amount === "number"
      && sameAmount(payment.amount, order.total)
      && (!payment.currency || payment.currency === restaurant?.currency);
  }

  if (confirmed) {
    const now = new Date();
    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.order.updateMany({
        where: { id: orderId, tenantId, paymentProvider: provider, paymentStatus: "pending" },
        data: { paymentStatus: "paid", paidAt: now, status: "accepted", acceptedAt: now },
      });
      if (updated.count === 1) {
        await transaction.paymentEvent.create({
          data: {
            tenantId,
            orderId,
            provider,
            eventType: "provider_payment_confirmed",
            previousStatus: "pending",
            newStatus: "paid",
            externalPaymentId: providerPaymentId || order.externalPaymentId,
          },
        });
      }
    });
  }

  const updated = await prisma.order.findFirst({ where: { id: orderId, tenantId }, select: { paymentStatus: true } });
  return { found: true, paid: updated?.paymentStatus === "paid" };
}
