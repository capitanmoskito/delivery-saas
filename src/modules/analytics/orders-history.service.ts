import { addDays, monthRange, startOfDay, toDateKey, weekRange } from "@/src/lib/business-time";
import { prisma } from "@/src/lib/prisma";
import type { SalesPeriod } from "@/src/modules/analytics/sales-analytics.types";

const MAX_ORDERS = 1000;

export type OrdersHistoryOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  source: "online" | "local";
  fulfillmentType: string;
  status: string;
  received: boolean;
  total: number;
};

export type OrdersHistoryData = {
  period: SalesPeriod;
  from: string;
  to: string;
  currency: string;
  businessName: string;
  totals: { made: number; received: number; pending: number; revenue: number };
  days: Array<{ date: string; made: number; received: number; revenue: number }>;
  orders: OrdersHistoryOrder[];
  truncated: boolean;
};

// "Made" are paid or in-progress orders created in the range; "received" are those already delivered.
export async function getOrdersHistory(tenantId: string, period: SalesPeriod, anchor: string, endAnchor?: string): Promise<OrdersHistoryData> {
  const weekStart = weekRange(anchor);
  const weekEnd = endAnchor && endAnchor > anchor ? weekRange(endAnchor) : weekStart;
  const range = period === "day" ? { from: anchor, to: anchor } : period === "week" ? { from: weekStart.from, to: weekEnd.to } : monthRange(anchor);
  const [orders, restaurant, profile] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: startOfDay(range.from), lt: startOfDay(addDays(range.to, 1)) },
        NOT: { status: "pending_payment", paymentStatus: { not: "paid" } },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true, createdAt: true, source: true, fulfillmentType: true, status: true, total: true },
    }),
    prisma.restaurant.findFirst({ where: { tenantId }, select: { currency: true } }),
    prisma.businessProfile.findUnique({ where: { tenantId }, select: { businessName: true } }),
  ]);

  const dayMap = new Map<string, { date: string; made: number; received: number; revenue: number }>();
  for (let date = range.from; date <= range.to; date = addDays(date, 1)) dayMap.set(date, { date, made: 0, received: 0, revenue: 0 });

  const totals = { made: 0, received: 0, pending: 0, revenue: 0 };
  for (const order of orders) {
    const received = order.status === "delivered";
    const day = dayMap.get(toDateKey(order.createdAt));
    totals.made += 1;
    totals.revenue += order.total;
    if (received) totals.received += 1;
    if (day) {
      day.made += 1;
      day.revenue += order.total;
      if (received) day.received += 1;
    }
  }
  totals.pending = totals.made - totals.received;

  return {
    period,
    from: range.from,
    to: range.to,
    currency: restaurant?.currency ?? "MXN",
    businessName: profile?.businessName ?? "",
    totals,
    days: Array.from(dayMap.values()),
    orders: orders.slice(0, MAX_ORDERS).map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber || order.id.slice(0, 8),
      createdAt: order.createdAt.toISOString(),
      source: order.source === "online" ? "online" : "local",
      fulfillmentType: order.fulfillmentType,
      status: order.status,
      received: order.status === "delivered",
      total: order.total,
    })),
    truncated: orders.length > MAX_ORDERS,
  };
}
