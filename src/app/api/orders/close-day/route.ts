import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const latestClosure = await prisma.businessDayClosure.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { endsAt: "desc" },
      select: { endsAt: true }
    });
    const startsAt = latestClosure?.endsAt || startOfDay(new Date());
    const endsAt = new Date();
    const orders = await prisma.order.findMany({
      where: {
        tenantId: user.tenantId,
        createdAt: { gt: startsAt, lte: endsAt }
      },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    const hourlyOrders = new Map<number, number>();
    const products = new Map<string, { name: string; quantity: number }>();
    const customers = new Map<string, { name: string; orders: number }>();

    for (const order of orders) {
      const hour = order.createdAt.getHours();
      hourlyOrders.set(hour, (hourlyOrders.get(hour) || 0) + 1);
      const customerName = order.customerName || `${order.customer.firstName} ${order.customer.lastName}`.trim();
      const customer = customers.get(customerName) || { name: customerName, orders: 0 };
      customer.orders += 1;
      customers.set(customerName, customer);

      for (const item of order.items) {
        const product = products.get(item.productId) || { name: item.product.name, quantity: 0 };
        product.quantity += item.quantity;
        products.set(item.productId, product);
      }
    }

    const summary = {
      busiestHours: Array.from(hourlyOrders, ([hour, orderCount]) => ({ hour, orderCount }))
        .sort((first, second) => second.orderCount - first.orderCount)
        .slice(0, 3),
      starDishes: Array.from(products.values())
        .sort((first, second) => second.quantity - first.quantity)
        .slice(0, 5),
      recurringCustomers: Array.from(customers.values())
        .filter((customer) => customer.orders > 1)
        .sort((first, second) => second.orders - first.orders)
        .slice(0, 5)
    };
    const closure = await prisma.businessDayClosure.create({
      data: {
        tenantId: user.tenantId,
        startsAt,
        endsAt,
        orderCount: orders.length,
        totalAmount: orders.reduce((total, order) => total + order.total, 0),
        onlineOrderCount: orders.filter((order) => order.source === "online").length,
        localOrderCount: orders.filter((order) => order.source === "local").length,
        summary
      }
    });

    return NextResponse.json(closure, { status: 201 });
  } catch (error) {
    console.error("Error closing business day:", error);
    return NextResponse.json({ error: "No se pudo cerrar la jornada" }, { status: 500 });
  }
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}