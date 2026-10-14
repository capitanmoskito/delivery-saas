import { randomInt } from "node:crypto";

import { Prisma } from "@prisma/client";

export const DELIVERY_CODE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 25;

export function isValidDeliveryCode(value: string) {
  return /^\d{4}$/.test(value);
}

// Creates a unique 4-digit code for the order, or returns the existing active one.
export async function ensureDeliveryCode(transaction: Prisma.TransactionClient, order: { id: string; tenantId: string }) {
  const existing = await transaction.deliveryCode.findUnique({ where: { orderId: order.id } });
  const now = new Date();

  if (existing?.activeCode && existing.expiresAt > now) return existing;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = String(randomInt(0, 10000)).padStart(4, "0");
    const taken = await transaction.deliveryCode.findFirst({
      where: { activeCode: code, expiresAt: { gt: now } },
      select: { id: true },
    });
    if (taken) continue;

    // Free the slot of an expired code that still holds it.
    await transaction.deliveryCode.updateMany({ where: { activeCode: code, expiresAt: { lte: now } }, data: { activeCode: null } });

    const data = { code, activeCode: code, expiresAt: new Date(now.getTime() + DELIVERY_CODE_TTL_MS), claimedAt: null, deliveredAt: null };
    return existing
      ? transaction.deliveryCode.update({ where: { id: existing.id }, data })
      : transaction.deliveryCode.create({ data: { ...data, tenantId: order.tenantId, orderId: order.id } });
  }

  throw new Error("No hay códigos de envío disponibles en este momento.");
}

export async function releaseDeliveryCode(transaction: Prisma.TransactionClient, orderId: string) {
  await transaction.deliveryCode.updateMany({
    where: { orderId, activeCode: { not: null } },
    data: { activeCode: null, deliveredAt: new Date() },
  });
}
