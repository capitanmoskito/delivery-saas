import { NextResponse } from "next/server";

import { isDateKey, toDateKey } from "@/src/lib/business-time";
import { getCurrentUser } from "@/src/lib/current-user";
import { getSalesDashboard } from "@/src/modules/analytics/sales-analytics.service";
import type { SalesPeriod } from "@/src/modules/analytics/sales-analytics.types";

const periods: SalesPeriod[] = ["day", "week", "month"];

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const periodParam = params.get("period");
    const dateParam = params.get("date");
    const period = periods.find((item) => item === periodParam) ?? "week";
    const today = toDateKey(new Date());
    const anchor = isDateKey(dateParam) && dateParam <= today ? dateParam : today;

    return NextResponse.json(await getSalesDashboard(user.tenantId, period, anchor));
  } catch (error) {
    console.error("Error loading sales dashboard:", error);
    return NextResponse.json({ error: "No se pudo cargar el resumen" }, { status: 500 });
  }
}
