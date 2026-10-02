import type { PaymentCredentials } from "@/src/lib/payment-credentials";

export type PaymentProviderName = "mercadopago" | "clip";

export type PaymentIntentInput = {
  orderId: string;
  tenantId: string;
  orderNumber: string;
  total: number;
  currency: string;
  customerName: string;
  customerEmail: string;
};

export type PaymentIntent = { externalPaymentId: string; redirectUrl: string };

interface PaymentProvider {
  createIntent(input: PaymentIntentInput, credentials: PaymentCredentials): Promise<PaymentIntent>;
}

function getPublicCallbackBase() {
  const configuredBase = process.env.PAYMENT_CALLBACK_BASE_URL;
  if (!configuredBase) throw new Error("Configura PAYMENT_CALLBACK_BASE_URL con el dominio HTTPS público de la tienda.");

  const url = new URL(configuredBase);
  if (url.protocol !== "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    throw new Error("PAYMENT_CALLBACK_BASE_URL debe ser una URL HTTPS pública.");
  }
  return url.origin;
}

function trustedRedirect(urlValue: string, provider: PaymentProviderName) {
  const redirectUrl = new URL(urlValue);
  const allowedHost = provider === "clip"
    ? redirectUrl.hostname === "payclip.com" || redirectUrl.hostname.endsWith(".payclip.com")
    : redirectUrl.hostname === "mercadopago.com" || redirectUrl.hostname.endsWith(".mercadopago.com") || redirectUrl.hostname === "mercadopago.com.mx" || redirectUrl.hostname.endsWith(".mercadopago.com.mx");
  if (redirectUrl.protocol !== "https:" || !allowedHost) throw new Error(`La URL de pago de ${provider} no es válida.`);
  return redirectUrl.toString();
}

class MercadoPagoProvider implements PaymentProvider {
  async createIntent(input: PaymentIntentInput, credentials: PaymentCredentials): Promise<PaymentIntent> {
    const accessToken = credentials.mercadoPagoAccessToken;
    if (!accessToken) throw new Error("No hay Access Token de Mercado Pago configurado.");
    if (input.total <= 0) throw new Error("El total debe ser mayor a cero para pagar con tarjeta.");

    const callbackBase = getPublicCallbackBase();
    const returnUrl = new URL("/checkout", callbackBase);
    returnUrl.searchParams.set("orderId", input.orderId);
    const webhookUrl = new URL("/api/payments/mercadopago/webhook", callbackBase);
    webhookUrl.searchParams.set("tenantId", input.tenantId);
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.orderId,
      },
      body: JSON.stringify({
        items: [{ id: input.orderId, title: `Pedido ${input.orderNumber}`, quantity: 1, currency_id: input.currency, unit_price: input.total }],
        payer: { name: input.customerName, email: input.customerEmail },
        external_reference: input.orderId,
        back_urls: { success: returnUrl.toString(), pending: returnUrl.toString(), failure: returnUrl.toString() },
        auto_return: "approved",
        notification_url: webhookUrl.toString(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data: { id?: string; init_point?: string; message?: string } = await response.json();
    if (!response.ok || !data.id || !data.init_point) throw new Error(data.message || "Mercado Pago no pudo crear el link de pago.");
    return { externalPaymentId: data.id, redirectUrl: trustedRedirect(data.init_point, "mercadopago") };
  }
}

class ClipProvider implements PaymentProvider {
  async createIntent(input: PaymentIntentInput, credentials: PaymentCredentials): Promise<PaymentIntent> {
    const apiKey = credentials.clipApiKey;
    const apiSecret = credentials.clipApiSecret;
    if (!apiKey || !apiSecret) throw new Error("Configura la API Key y la clave secreta de Clip.");
    if (input.total < 1) throw new Error("Clip requiere un total de al menos $1.00.");

    const callbackBase = getPublicCallbackBase();
    const successUrl = new URL("/checkout", callbackBase);
    successUrl.searchParams.set("orderId", input.orderId);
    const errorUrl = new URL(successUrl);
    errorUrl.searchParams.set("payment", "failed");
    const webhookUrl = new URL("/api/payments/clip/webhook", callbackBase);
    webhookUrl.searchParams.set("tenantId", input.tenantId);
    const response = await fetch("https://api.payclip.com/v2/checkout", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.total,
        currency: input.currency,
        purchase_description: `Pedido ${input.orderNumber}`,
        redirection_url: { success: successUrl.toString(), error: errorUrl.toString(), default: successUrl.toString() },
        webhook_url: webhookUrl.toString(),
        metadata: { external_reference: input.orderId, customer_info: { name: input.customerName, email: input.customerEmail } },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data: { payment_request_id?: string; payment_request_url?: string; message?: string } = await response.json();
    if (!response.ok || !data.payment_request_id || !data.payment_request_url) throw new Error(data.message || "Clip no pudo crear el link de pago.");
    return { externalPaymentId: data.payment_request_id, redirectUrl: trustedRedirect(data.payment_request_url, "clip") };
  }
}

export function createPaymentProvider(provider: PaymentProviderName): PaymentProvider {
  switch (provider) {
    case "mercadopago": return new MercadoPagoProvider();
    case "clip": return new ClipProvider();
  }
}
