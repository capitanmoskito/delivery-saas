export type BillingProviderName = "clip";

export type BillingCheckoutInput = {
  paymentId: string;
  tenantId: string;
  businessName: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail: string;
};

export type BillingCheckout = { externalPaymentId: string; redirectUrl: string };

export type BillingVerificationInput = {
  externalPaymentId: string;
  paymentId: string;
  amount: number;
  currency: string;
};

export interface BillingPaymentProvider {
  createCheckout(input: BillingCheckoutInput): Promise<BillingCheckout>;
  isPaid(input: BillingVerificationInput): Promise<boolean>;
}

export class BillingNotConfiguredError extends Error {}

function getPublicCallbackBase() {
  const configuredBase = process.env.PAYMENT_CALLBACK_BASE_URL;
  if (!configuredBase) throw new BillingNotConfiguredError("Configura PAYMENT_CALLBACK_BASE_URL con el dominio HTTPS público de la plataforma.");

  const url = new URL(configuredBase);
  if (url.protocol !== "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    throw new BillingNotConfiguredError("PAYMENT_CALLBACK_BASE_URL debe ser una URL HTTPS pública.");
  }
  return url.origin;
}

function sameAmount(left: number, right: number) {
  return Math.round(left * 100) === Math.round(right * 100);
}

// Charges tenants with the platform owner's Clip account (CLIP_API_KEY / CLIP_API_SECRET).
class ClipBillingProvider implements BillingPaymentProvider {
  private authorization() {
    const apiKey = process.env.CLIP_API_KEY;
    const apiSecret = process.env.CLIP_API_SECRET;
    if (!apiKey || !apiSecret) throw new BillingNotConfiguredError("El cobro con Clip aún no está configurado. Contacta al administrador de la plataforma.");
    return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
  }

  async createCheckout(input: BillingCheckoutInput): Promise<BillingCheckout> {
    const authorization = this.authorization();
    const callbackBase = getPublicCallbackBase();
    const successUrl = new URL("/business/billing", callbackBase);
    successUrl.searchParams.set("paymentId", input.paymentId);
    const errorUrl = new URL(successUrl);
    errorUrl.searchParams.set("status", "failed");
    const webhookUrl = new URL("/api/billing/clip/webhook", callbackBase);

    const response = await fetch("https://api.payclip.com/v2/checkout", {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        purchase_description: input.description,
        redirection_url: { success: successUrl.toString(), error: errorUrl.toString(), default: successUrl.toString() },
        webhook_url: webhookUrl.toString(),
        metadata: { external_reference: input.paymentId, customer_info: { name: input.businessName, email: input.customerEmail } }
      }),
      signal: AbortSignal.timeout(15_000)
    });
    const data: { payment_request_id?: string; payment_request_url?: string; message?: string } = await response.json();
    if (!response.ok || !data.payment_request_id || !data.payment_request_url) {
      throw new Error(data.message || "Clip no pudo crear el link de pago.");
    }

    const redirect = new URL(data.payment_request_url);
    if (redirect.protocol !== "https:" || !(redirect.hostname === "payclip.com" || redirect.hostname.endsWith(".payclip.com"))) {
      throw new Error("La URL de pago de Clip no es válida.");
    }
    return { externalPaymentId: data.payment_request_id, redirectUrl: redirect.toString() };
  }

  async isPaid(input: BillingVerificationInput): Promise<boolean> {
    const response = await fetch(`https://api.payclip.com/v2/checkout/${encodeURIComponent(input.externalPaymentId)}`, {
      headers: { Authorization: this.authorization() },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return false;
    const payment: { status?: string; amount?: number; currency?: string; metadata?: { external_reference?: string } } = await response.json();
    return payment.status === "CHECKOUT_COMPLETED"
      && payment.metadata?.external_reference === input.paymentId
      && typeof payment.amount === "number"
      && sameAmount(payment.amount, input.amount)
      && (!payment.currency || payment.currency === input.currency);
  }
}

export function createBillingProvider(provider: BillingProviderName): BillingPaymentProvider {
  switch (provider) {
    case "clip": return new ClipBillingProvider();
  }
}
