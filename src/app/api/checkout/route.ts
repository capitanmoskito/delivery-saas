import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { decryptPaymentCredentials } from "@/src/lib/payment-credentials";
import { prisma } from "@/src/lib/prisma";
import { buildCheckoutQuote, CheckoutQuoteError, type CheckoutItemInput } from "@/src/modules/payments/checkout-quote";
import { createPaymentProvider, type PaymentProviderName } from "@/src/modules/payments/payment-provider.factory";

type SessionUser = { id?: unknown; role?: unknown } | null;

function normalizeItems(value: unknown): CheckoutItemInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId : "";
    const quantity = Number(item.quantity);
    const additionIds = Array.isArray(item.additionIds) ? item.additionIds.filter((id): id is string => typeof id === "string") : [];
    return productId && Number.isInteger(quantity) ? [{ productId, quantity, additionIds }] : [];
  });
}

export async function POST(request: Request) {
  try {
    const session = (await getCurrentUser()) as SessionUser;
    if (typeof session?.id !== "string" || session.role !== "customer") {
      return NextResponse.json({ error: "Inicia sesión con tu cuenta de cliente para pagar." }, { status: 401 });
    }

    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const restaurantId = String(data.restaurantId ?? "");
    const items = normalizeItems(data.items);
    const paymentMethod = data.paymentMethod === "transfer" ? "transfer" : "card";
    const requestedProvider = String(data.provider ?? "");
    if (paymentMethod === "card" && requestedProvider !== "mercadopago" && requestedProvider !== "clip") {
      return NextResponse.json({ error: "Selecciona una pasarela de tarjeta disponible." }, { status: 400 });
    }
    const providerName = paymentMethod === "card" ? requestedProvider as PaymentProviderName : null;
    const quote = await buildCheckoutQuote({
      restaurantId,
      items,
      discountCode: String(data.discountCode ?? ""),
      paymentMethod,
      userId: session.id,
    });
    if (!quote.profileComplete) {
      return NextResponse.json({ error: "Completa tu perfil y una dirección con teléfono de 10 dígitos antes de pagar." }, { status: 400 });
    }
    if (paymentMethod === "card" && !quote.paymentMethods.cardProviders.includes(providerName as PaymentProviderName)) {
      return NextResponse.json({ error: "La pasarela seleccionada no está habilitada para este negocio." }, { status: 400 });
    }
    if (paymentMethod === "transfer" && !quote.paymentMethods.transferEnabled) {
      return NextResponse.json({ error: "La transferencia no está habilitada para este negocio." }, { status: 400 });
    }

    const [address, userProfile] = await Promise.all([
      prisma.customerAddress.findFirst({ where: { userId: session.id }, orderBy: { updatedAt: "desc" } }),
      prisma.user.findUnique({ where: { id: session.id }, select: { firstName: true, lastNamePaternal: true, email: true, role: true } }),
    ]);
    if (!address || !userProfile || userProfile.role !== "customer") {
      return NextResponse.json({ error: "Completa tu perfil y dirección antes de pagar." }, { status: 400 });
    }

    const order = await prisma.$transaction(async (transaction) => {
      if (quote.promoCodeId) {
        const promoCode = await transaction.promoCode.findUnique({ where: { id: quote.promoCodeId } });
        const now = new Date();
        if (!promoCode || !promoCode.active || (promoCode.startsAt && promoCode.startsAt > now) || (promoCode.endsAt && promoCode.endsAt < now)) {
          throw new CheckoutQuoteError("El código de descuento dejó de estar disponible.", 409);
        }
        const usage = await transaction.promoCode.updateMany({
          where: {
            id: promoCode.id,
            active: true,
            ...(promoCode.usageLimit === null ? {} : { usedCount: { lt: promoCode.usageLimit } }),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (usage.count !== 1) throw new CheckoutQuoteError("El código de descuento alcanzó su límite de usos.", 409);
      }

      const customer = await transaction.customer.upsert({
        where: { tenantId_userId: { tenantId: quote.tenantId, userId: session.id as string } },
        create: { tenantId: quote.tenantId, userId: session.id as string, firstName: userProfile.firstName, lastName: userProfile.lastNamePaternal, email: userProfile.email, phone: address.contactPhone },
        update: { firstName: userProfile.firstName, lastName: userProfile.lastNamePaternal, phone: address.contactPhone }
      });
      const createdOrder = await transaction.order.create({
        data: {
          tenantId: quote.tenantId,
          customerId: customer.id,
          orderNumber: `WEB-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          source: "online",
          fulfillmentType: "delivery",
          paymentMethod,
          paymentProvider: providerName,
          paymentStatus: "pending",
          discountCode: quote.discountCode,
          appliedPromotions: quote.appliedPromotions,
          customerName: `${userProfile.firstName} ${userProfile.lastNamePaternal}`,
          deliveryAddress: address.street,
          postalCode: address.postalCode,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          deliveryReference: address.reference,
          contactPhone: address.contactPhone,
          latitude: address.latitude,
          longitude: address.longitude,
          status: "pending_payment",
          subtotal: quote.subtotal,
          discountTotal: quote.discountTotal,
          total: quote.total,
          items: { create: quote.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice, additions: item.additions })) },
        },
        select: { id: true, orderNumber: true, total: true, paymentStatus: true },
      });
      await transaction.paymentEvent.create({
        data: {
          tenantId: quote.tenantId,
          orderId: createdOrder.id,
          actorUserId: session.id as string,
          provider: providerName,
          eventType: "checkout_created",
          previousStatus: null,
          newStatus: "pending",
        },
      });
      return createdOrder;
    });

    if (paymentMethod === "transfer") {
      return NextResponse.json({ success: true, order, transfer: quote.paymentMethods.transfer }, { status: 201 });
    }

    const config = await prisma.paymentProviderConfig.findUnique({
      where: { tenantId_provider: { tenantId: quote.tenantId, provider: providerName as PaymentProviderName } },
    });
    if (!config?.enabled) return NextResponse.json({ error: "La pasarela ya no está habilitada." }, { status: 409 });

    const credentials = decryptPaymentCredentials(config.credentialsEncrypted);
    const provider = createPaymentProvider(providerName as PaymentProviderName);
    const intent = await provider.createIntent({
      orderId: order.id,
      tenantId: quote.tenantId,
      orderNumber: order.orderNumber || order.id,
      total: order.total,
      currency: quote.currency,
      customerName: `${userProfile.firstName} ${userProfile.lastNamePaternal}`,
      customerEmail: userProfile.email,
    }, credentials);
    await prisma.order.update({ where: { id: order.id }, data: { externalPaymentId: intent.externalPaymentId } });
    return NextResponse.json({ success: true, order, paymentUrl: intent.redirectUrl }, { status: 201 });
  } catch (error) {
    console.error("Checkout error:", error);
    if (error instanceof CheckoutQuoteError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo iniciar el pago." }, { status: 502 });
  }
}