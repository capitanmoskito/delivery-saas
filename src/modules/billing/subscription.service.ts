import { prisma } from "@/src/lib/prisma";
import { buildBillingNotice, daysUntil, type BillingNotice } from "@/src/modules/billing/billing-notice";
import { createBillingProvider, type BillingProviderName } from "@/src/modules/billing/billing-provider.factory";

const SYSTEM_ACTOR = "system";
const PENDING_REUSE_MS = 30 * 60 * 1000;

export function getMonthlyPrice(): number {
  const configured = Number(process.env.SUBSCRIPTION_MONTHLY_PRICE);
  return Number.isFinite(configured) && configured >= 1 ? configured : 499;
}

function addOneMonth(date: Date): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export type BillingOverview = {
  tenantStatus: string;
  monthlyPrice: number;
  currency: string;
  dueDate: Date | null;
  lastPaymentAt: Date | null;
  notice: BillingNotice | null;
  daysLeft: number | null;
};

export async function getBillingOverview(tenantId: string): Promise<BillingOverview | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true, trialEndsAt: true, subscription: true }
  });
  if (!tenant) return null;

  const dueDate = tenant.subscription?.currentPeriodEnd ?? tenant.trialEndsAt ?? null;
  const daysLeft = dueDate ? daysUntil(dueDate) : null;

  return {
    tenantStatus: tenant.status,
    monthlyPrice: tenant.subscription?.monthlyPrice ?? getMonthlyPrice(),
    currency: tenant.subscription?.currency ?? "MXN",
    dueDate,
    lastPaymentAt: tenant.subscription?.lastPaymentAt ?? null,
    notice: daysLeft === null ? null : buildBillingNotice(daysLeft),
    daysLeft
  };
}

export async function createSubscriptionCheckout(tenantId: string, customerEmail: string, providerName: BillingProviderName = "clip") {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessName: true, subscription: true } });
  if (!tenant) throw new Error("Negocio no encontrado.");

  const reusable = await prisma.subscriptionPayment.findFirst({
    where: { tenantId, status: "pending", provider: providerName, checkoutUrl: { not: null }, createdAt: { gte: new Date(Date.now() - PENDING_REUSE_MS) } },
    orderBy: { createdAt: "desc" }
  });
  if (reusable?.checkoutUrl) return { url: reusable.checkoutUrl, paymentId: reusable.id };

  const amount = tenant.subscription?.monthlyPrice ?? getMonthlyPrice();
  const currency = tenant.subscription?.currency ?? "MXN";
  const payment = await prisma.subscriptionPayment.create({ data: { tenantId, amount, currency, provider: providerName } });

  try {
    const checkout = await createBillingProvider(providerName).createCheckout({
      paymentId: payment.id,
      tenantId,
      businessName: tenant.businessName,
      amount,
      currency,
      description: `Mensualidad TuPedidos - ${tenant.businessName}`,
      customerEmail
    });
    await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: { externalPaymentId: checkout.externalPaymentId, checkoutUrl: checkout.redirectUrl }
    });
    await recordAudit(tenantId, SYSTEM_ACTOR, "subscription.checkout_created", null, `pending:${payment.id}`);
    return { url: checkout.redirectUrl, paymentId: payment.id };
  } catch (error) {
    await prisma.subscriptionPayment.update({ where: { id: payment.id }, data: { status: "failed" } });
    throw error;
  }
}

// Verifies the payment with the provider and renews the subscription. Safe to call repeatedly.
export async function syncSubscriptionPayment(where: { id?: string; externalPaymentId?: string; tenantId?: string }) {
  const payment = await prisma.subscriptionPayment.findFirst({
    where: { ...where, provider: "clip" }
  });
  if (!payment) return null;
  if (payment.status === "paid" || !payment.externalPaymentId) return payment;

  const paid = await createBillingProvider("clip").isPaid({
    externalPaymentId: payment.externalPaymentId,
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency
  });
  if (!paid) return payment;

  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.subscriptionPayment.updateMany({
      where: { id: payment.id, status: { not: "paid" } },
      data: { status: "paid", paidAt: now }
    });
    if (claimed.count !== 1) return;

    const tenant = await transaction.tenant.findUnique({
      where: { id: payment.tenantId },
      select: { status: true, trialEndsAt: true, subscription: true }
    });
    if (!tenant) return;

    const due = tenant.subscription?.currentPeriodEnd ?? tenant.trialEndsAt;
    const periodStart = due && due > now ? due : now;
    const periodEnd = addOneMonth(periodStart);

    await transaction.subscriptionPayment.update({ where: { id: payment.id }, data: { periodStart, periodEnd } });
    await transaction.tenantSubscription.upsert({
      where: { tenantId: payment.tenantId },
      create: { tenantId: payment.tenantId, monthlyPrice: payment.amount, currency: payment.currency, currentPeriodEnd: periodEnd, lastPaymentAt: now },
      update: { currentPeriodEnd: periodEnd, lastPaymentAt: now }
    });
    const nextStatus = tenant.status === "cancelled" ? tenant.status : "active";
    await transaction.tenant.update({ where: { id: payment.tenantId }, data: { status: nextStatus } });
    await transaction.businessConfigurationAudit.createMany({
      data: [
        { tenantId: payment.tenantId, userId: SYSTEM_ACTOR, fieldName: "subscription.payment", previousValue: payment.status, newValue: `paid:${payment.id}` },
        { tenantId: payment.tenantId, userId: SYSTEM_ACTOR, fieldName: "tenant.status", previousValue: tenant.status, newValue: nextStatus },
        { tenantId: payment.tenantId, userId: SYSTEM_ACTOR, fieldName: "subscription.currentPeriodEnd", previousValue: due?.toISOString() ?? null, newValue: periodEnd.toISOString() }
      ]
    });
  });

  return prisma.subscriptionPayment.findUnique({ where: { id: payment.id } });
}

async function recordAudit(tenantId: string, userId: string, fieldName: string, previousValue: string | null, newValue: string) {
  await prisma.businessConfigurationAudit.create({ data: { tenantId, userId, fieldName, previousValue, newValue } });
}
