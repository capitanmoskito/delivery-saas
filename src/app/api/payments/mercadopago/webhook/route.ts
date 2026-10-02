import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { decryptPaymentCredentials } from "@/src/lib/payment-credentials";
import { prisma } from "@/src/lib/prisma";
import { syncProviderPayment } from "@/src/modules/payments/sync-payment-status";

function isValidSignature(signatureHeader: string, requestId: string, dataId: string, secret: string) {
  const signatureParts = new Map(signatureHeader.split(",").map((part) => {
    const [key, value] = part.trim().split("=", 2);
    return [key, value];
  }));
  const timestamp = signatureParts.get("ts");
  const providedSignature = signatureParts.get("v1");
  if (!timestamp || !providedSignature || !/^[a-f\d]+$/i.test(providedSignature)) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expectedSignature = createHmac("sha256", secret).update(manifest).digest();
  const receivedSignature = Buffer.from(providedSignature, "hex");
  return expectedSignature.length === receivedSignature.length && timingSafeEqual(expectedSignature, receivedSignature);
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenantId");
    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const payload = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : {};
    const paymentId = String(payload.id ?? data.id ?? "");
    const config = tenantId
      ? await prisma.paymentProviderConfig.findUnique({ where: { tenantId_provider: { tenantId, provider: "mercadopago" } } })
      : null;
    const credentials = config ? decryptPaymentCredentials(config.credentialsEncrypted) : null;
    const signatureDataId = url.searchParams.get("data.id") || paymentId;
    const signature = request.headers.get("x-signature") || "";
    const requestId = request.headers.get("x-request-id") || "";

    if (!tenantId || !paymentId || !credentials?.mercadoPagoAccessToken || !credentials.mercadoPagoWebhookSecret) {
      return NextResponse.json({ error: "Notificación no válida." }, { status: 400 });
    }
    if (!isValidSignature(signature, requestId, signatureDataId, credentials.mercadoPagoWebhookSecret)) {
      return NextResponse.json({ error: "Firma de webhook no válida." }, { status: 401 });
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${credentials.mercadoPagoAccessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return NextResponse.json({ received: true });
    const payment: { external_reference?: string } = await response.json();
    if (payment.external_reference) {
      await syncProviderPayment({ tenantId, orderId: payment.external_reference, provider: "mercadopago", providerPaymentId: paymentId });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Mercado Pago webhook error:", error);
    return NextResponse.json({ error: "No se pudo validar la notificación." }, { status: 500 });
  }
}
