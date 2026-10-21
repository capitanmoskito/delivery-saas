import { NextResponse } from "next/server";

import { isDateKey, toDateKey } from "@/src/lib/business-time";
import { getCurrentUser } from "@/src/lib/current-user";
import { getOrdersHistory } from "@/src/modules/analytics/orders-history.service";
import type { SalesPeriod } from "@/src/modules/analytics/sales-analytics.types";

const periods: SalesPeriod[] = ["day", "week", "month"];

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.tenantId) return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const period = periods.find((item) => item === params.get("period")) ?? "day";
    const dateParam = params.get("date");
    const today = toDateKey(new Date());
    const anchor = isDateKey(dateParam) && dateParam <= today ? dateParam : today;

    const toParam = params.get("to");
    const endAnchor = period === "week" && isDateKey(toParam) && toParam <= today ? toParam : undefined;

    return NextResponse.json({ today, ...(await getOrdersHistory(user.tenantId, period, anchor, endAnchor)) });
  } catch (error) {
    console.error("Error loading orders history:", error);
    return NextResponse.json({ error: "No se pudo cargar el historial de pedidos" }, { status: 500 });
  }
}
