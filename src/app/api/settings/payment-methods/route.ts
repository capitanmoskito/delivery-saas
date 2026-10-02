import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { decryptPaymentCredentials, encryptPaymentCredentials } from "@/src/lib/payment-credentials";
import { prisma } from "@/src/lib/prisma";

type SessionUser = { id?: unknown; tenantId?: unknown } | null;
type ProviderName = "mercadopago" | "clip";

function isProviderName(value: string): value is ProviderName {
  return value === "mercadopago" || value === "clip";
}

function hasPublicCallbackBase() {
  try {
    const callbackBase = new URL(process.env.PAYMENT_CALLBACK_BASE_URL || "");
    return callbackBase.protocol === "https:" && callbackBase.hostname !== "localhost" && callbackBase.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

export async function GET() {
  const session = (await getCurrentUser()) as SessionUser;
  if (typeof session?.tenantId !== "string") return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });

  const [providers, transfer] = await Promise.all([
    prisma.paymentProviderConfig.findMany({ where: { tenantId: session.tenantId }, select: { provider: true, enabled: true, credentialsEncrypted: true } }),
    prisma.businessTransferDetails.findUnique({ where: { tenantId: session.tenantId } }),
  ]);

  return NextResponse.json({
    providers: {
      mercadopago: providerStatus("mercadopago", providers),
      clip: providerStatus("clip", providers),
    },
    transfer: transfer
      ? {
          enabled: transfer.enabled,
          bankName: transfer.bankName,
          accountHolder: transfer.accountHolder,
          accountNumber: transfer.accountNumber || "",
          clabe: transfer.clabe || "",
          instructions: transfer.instructions || "",
        }
      : { enabled: false, bankName: "", accountHolder: "", accountNumber: "", clabe: "", instructions: "" },
  });
}

function providerStatus(provider: ProviderName, providers: Array<{ provider: string; enabled: boolean; credentialsEncrypted: string }>) {
  const config = providers.find((entry) => entry.provider === provider);
  return { enabled: config?.enabled ?? false, configured: Boolean(config?.credentialsEncrypted) };
}

export async function POST(request: Request) {
  try {
    const session = (await getCurrentUser()) as SessionUser;
    if (typeof session?.id !== "string" || typeof session.tenantId !== "string") {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const editSession = await prisma.settingsEditSession.findFirst({
      where: { tenantId: session.tenantId, userId: session.id, active: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!editSession) return NextResponse.json({ error: "Valida el código OTP antes de guardar la configuración." }, { status: 403 });

    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const providerInputs = data.providers && typeof data.providers === "object" ? (data.providers as Record<string, unknown>) : {};
    const transferInput = data.transfer && typeof data.transfer === "object" ? (data.transfer as Record<string, unknown>) : {};
    const enablingCardProvider = Object.entries(providerInputs).some(([provider, input]) =>
      isProviderName(provider) && Boolean(input && typeof input === "object" && (input as Record<string, unknown>).enabled === true),
    );
    if (enablingCardProvider && !hasPublicCallbackBase()) {
      return NextResponse.json({ error: "Configura PAYMENT_CALLBACK_BASE_URL con el dominio HTTPS público antes de habilitar pagos con tarjeta." }, { status: 400 });
    }
    const transfer = {
      enabled: transferInput.enabled === true,
      bankName: String(transferInput.bankName ?? "").trim(),
      accountHolder: String(transferInput.accountHolder ?? "").trim(),
      accountNumber: String(transferInput.accountNumber ?? "").replace(/\s/g, ""),
      clabe: String(transferInput.clabe ?? "").replace(/\s/g, ""),
      instructions: String(transferInput.instructions ?? "").trim(),
    };

    if (transfer.enabled && (!transfer.bankName || !transfer.accountHolder || (!transfer.accountNumber && !/^\d{18}$/.test(transfer.clabe)))) {
      return NextResponse.json({ error: "Para activar transferencia indica banco, titular y cuenta o CLABE de 18 dígitos." }, { status: 400 });
    }
    if (transfer.clabe && !/^\d{18}$/.test(transfer.clabe)) {
      return NextResponse.json({ error: "La CLABE debe contener 18 dígitos." }, { status: 400 });
    }

    const existingProviders = await prisma.paymentProviderConfig.findMany({ where: { tenantId: session.tenantId } });
    const providerWrites: Array<{ provider: ProviderName; enabled: boolean; credentialsEncrypted: string }> = [];

    for (const [providerName, providerValue] of Object.entries(providerInputs)) {
      if (!isProviderName(providerName) || !providerValue || typeof providerValue !== "object") continue;
      const input = providerValue as Record<string, unknown>;
      const existing = existingProviders.find((entry) => entry.provider === providerName);
      const enabled = input.enabled === true;
      let credentialsEncrypted = existing?.credentialsEncrypted || "";
      const clearCredentials = input.clearCredentials === true;

      if (providerName === "mercadopago") {
        const accessToken = String(input.accessToken ?? "").trim();
        const webhookSecret = String(input.webhookSecret ?? "").trim();
        if (accessToken || webhookSecret) {
          const existingCredentials = existing ? decryptPaymentCredentials(existing.credentialsEncrypted) : {};
          credentialsEncrypted = encryptPaymentCredentials({
            ...existingCredentials,
            mercadoPagoAccessToken: accessToken || existingCredentials.mercadoPagoAccessToken,
            mercadoPagoWebhookSecret: webhookSecret || existingCredentials.mercadoPagoWebhookSecret,
          });
        }
      } else {
        const apiKey = String(input.apiKey ?? "").trim();
        const apiSecret = String(input.apiSecret ?? "").trim();
        if (apiKey || apiSecret) {
          if (!apiKey || !apiSecret) return NextResponse.json({ error: "Clip requiere API Key y clave secreta." }, { status: 400 });
          credentialsEncrypted = encryptPaymentCredentials({ clipApiKey: apiKey, clipApiSecret: apiSecret });
        }
      }

      if (clearCredentials) credentialsEncrypted = "";
      if (enabled && credentialsEncrypted) {
        const configuredCredentials = decryptPaymentCredentials(credentialsEncrypted);
        const isConfigured = providerName === "clip"
          ? Boolean(configuredCredentials.clipApiKey && configuredCredentials.clipApiSecret)
          : Boolean(configuredCredentials.mercadoPagoAccessToken && configuredCredentials.mercadoPagoWebhookSecret);
        if (!isConfigured) {
          return NextResponse.json({ error: providerName === "clip" ? "Clip requiere API Key y clave secreta." : "Mercado Pago requiere Access Token y secreto de firma de webhooks." }, { status: 400 });
        }
      } else if (enabled) {
        return NextResponse.json({ error: `Agrega las credenciales de ${providerName === "clip" ? "Clip" : "Mercado Pago"} antes de activarlo.` }, { status: 400 });
      }

      if (!clearCredentials && credentialsEncrypted) providerWrites.push({ provider: providerName, enabled, credentialsEncrypted });
      else if (existing) providerWrites.push({ provider: providerName, enabled: false, credentialsEncrypted: existing.credentialsEncrypted });
    }

    const existingTransfer = await prisma.businessTransferDetails.findUnique({ where: { tenantId: session.tenantId } });
    if (transfer.enabled && !transfer.bankName) return NextResponse.json({ error: "Indica el banco para activar transferencia." }, { status: 400 });

    await prisma.$transaction(async (transaction) => {
      for (const provider of providerWrites) {
        await transaction.paymentProviderConfig.upsert({
          where: { tenantId_provider: { tenantId: session.tenantId as string, provider: provider.provider } },
          create: { tenantId: session.tenantId as string, ...provider },
          update: { enabled: provider.enabled, credentialsEncrypted: provider.credentialsEncrypted },
        });
      }

      if (transfer.enabled || existingTransfer || transfer.bankName || transfer.accountHolder) {
        if (!transfer.bankName || !transfer.accountHolder) {
          if (transfer.enabled) throw new Error("Completa el banco y el titular de la cuenta.");
        } else {
          await transaction.businessTransferDetails.upsert({
            where: { tenantId: session.tenantId as string },
            create: { tenantId: session.tenantId as string, ...transfer },
            update: transfer,
          });
        }
      }

      await transaction.businessConfigurationAudit.create({
        data: {
          tenantId: session.tenantId as string,
          userId: session.id as string,
          fieldName: "Métodos de pago",
          previousValue: JSON.stringify({
            providers: existingProviders.map((entry) => ({ provider: entry.provider, enabled: entry.enabled })),
            transferEnabled: existingTransfer?.enabled ?? false,
          }),
          newValue: JSON.stringify({
            providers: providerWrites.map((entry) => ({ provider: entry.provider, enabled: entry.enabled })),
            transferEnabled: transfer.enabled,
          }),
        },
      });

      await transaction.settingsEditSession.update({ where: { id: editSession.id }, data: { active: false } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment settings update error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la configuración de pago." }, { status: 500 });
  }
}
