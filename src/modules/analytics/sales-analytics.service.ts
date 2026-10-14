import { prisma } from "@/src/lib/prisma";
import {
  addDays,
  diffDays,
  getZonedParts,
  monthRange,
  shiftMonth,
  startOfDay,
  toDateKey,
  weekRange,
  weekdayOfKey
} from "@/src/lib/business-time";
import type {
  MonthlyTrend,
  ProductSales,
  SalesBucket,
  SalesDashboardData,
  SalesPeriod,
  WeekdayPattern
} from "@/src/modules/analytics/sales-analytics.types";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Orders waiting for an online payment are not sales yet.
function countedOrders(tenantId: string, start: Date, end?: Date) {
  return {
    tenantId,
    createdAt: end ? { gte: start, lt: end } : { gte: start },
    NOT: { status: "pending_payment", paymentStatus: { not: "paid" } }
  };
}

type SourceKey = "online" | "local";

function normalizeSource(source: string): SourceKey {
  return source === "online" ? "online" : "local";
}

function formatKeyEs(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return `${day} de ${MONTHS_LONG[month - 1]}${year === getZonedParts(new Date()).year ? "" : ` ${year}`}`;
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? "am" : "pm";
  return `${hour % 12 || 12}${suffix}`;
}

function hourRangeText(hour: number) {
  const next = (hour + 1) % 24;
  const startSuffix = hour < 12 ? "am" : "pm";
  const endSuffix = next < 12 ? "am" : "pm";
  const start = hour % 12 || 12;
  const end = next % 12 || 12;
  return startSuffix === endSuffix ? `${start} y ${end} ${endSuffix}` : `${start} ${startSuffix} y ${end} ${endSuffix}`;
}

function monthKeyLabel(year: number, month: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

export function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

// Persists hourly aggregates so patterns survive even if raw orders are archived later.
export async function syncSalesStats(tenantId: string) {
  const last = await prisma.salesHourlyStat.aggregate({ where: { tenantId }, _max: { date: true } });
  const fromKey = last._max.date ? addDays(last._max.date, -1) : null;
  const start = fromKey ? startOfDay(fromKey) : new Date(0);

  const orders = await prisma.order.findMany({
    where: countedOrders(tenantId, start),
    select: { createdAt: true, source: true, total: true, items: { select: { quantity: true } } }
  });

  const rows = new Map<string, { date: string; hour: number; source: SourceKey; orders: number; units: number; revenue: number }>();
  for (const order of orders) {
    const date = toDateKey(order.createdAt);
    const hour = getZonedParts(order.createdAt).hour;
    const source = normalizeSource(order.source);
    const id = `${date}|${hour}|${source}`;
    const row = rows.get(id) || { date, hour, source, orders: 0, units: 0, revenue: 0 };
    row.orders += 1;
    row.units += order.items.reduce((sum, item) => sum + item.quantity, 0);
    row.revenue += order.total;
    rows.set(id, row);
  }

  await prisma.$transaction([
    prisma.salesHourlyStat.deleteMany({ where: { tenantId, ...(fromKey ? { date: { gte: fromKey } } : {}) } }),
    prisma.salesHourlyStat.createMany({
      skipDuplicates: true,
      data: Array.from(rows.values()).map((row) => {
        const [year, month] = row.date.split("-").map(Number);
        return { tenantId, ...row, year, month, dayOfWeek: weekdayOfKey(row.date) };
      })
    })
  ]);
}

function resolveRanges(period: SalesPeriod, anchor: string, today: string) {
  const current = period === "day" ? { from: anchor, to: anchor } : period === "week" ? weekRange(anchor) : monthRange(anchor);
  const previous = period === "day"
    ? { from: addDays(anchor, -1), to: addDays(anchor, -1) }
    : period === "week"
      ? { from: addDays(current.from, -7), to: addDays(current.from, -1) }
      : monthRange(shiftMonth(current.from, -1));

  // While a week or month is in progress, compare against the same elapsed days of the previous one.
  if (period !== "day" && today >= current.from && today <= current.to) {
    const elapsed = diffDays(current.from, today);
    const sameDay = addDays(previous.from, elapsed);
    if (sameDay < previous.to) previous.to = sameDay;
  }

  return { current, previous };
}

function describeSubject(period: SalesPeriod, anchor: string, range: { from: string; to: string }, today: string) {
  if (period === "day") {
    if (anchor === today) return "La venta de hoy";
    if (anchor === addDays(today, -1)) return "La venta de ayer";
    return `La venta del ${formatKeyEs(anchor)}`;
  }
  const isCurrent = today >= range.from && today <= range.to;
  if (period === "week") return isCurrent ? "La venta de esta semana" : `La venta de la semana del ${formatKeyEs(range.from)} al ${formatKeyEs(range.to)}`;
  const [year, month] = range.from.split("-").map(Number);
  return isCurrent ? "La venta de este mes" : `La venta de ${MONTHS_LONG[month - 1]} de ${year}`;
}

function buildSummary(options: {
  period: SalesPeriod;
  subject: string;
  revenue: number;
  previousRevenue: number;
  currency: string;
}) {
  const { period, subject, revenue, previousRevenue, currency } = options;
  const compare = period === "day" ? "el día anterior" : period === "week" ? "la semana anterior" : "el mes anterior";
  if (revenue === 0 && previousRevenue === 0) return "Aún no hay ventas registradas en este periodo.";
  if (previousRevenue === 0) return `${subject} fue de ${money(revenue, currency)}; no hubo ventas ${period === "day" ? compare : `en ${compare}`}.`;
  const change = Math.round(((revenue - previousRevenue) / previousRevenue) * 100);
  if (change === 0) return `${subject} fue igual que ${compare}.`;
  return `${subject} fue un ${Math.abs(change)}% ${change > 0 ? "mayor" : "menor"} que ${compare}.`;
}

function bucketsFor(period: SalesPeriod, range: { from: string; to: string }): SalesBucket[] {
  if (period === "day") {
    return Array.from({ length: 24 }, (_, hour) => ({ key: String(hour), label: hourLabel(hour), total: 0, online: 0, local: 0 }));
  }
  const length = diffDays(range.from, range.to) + 1;
  return Array.from({ length }, (_, index) => {
    const key = addDays(range.from, index);
    const day = Number(key.slice(8));
    return { key, label: period === "week" ? `${WEEKDAYS[weekdayOfKey(key)].slice(0, 3)} ${day}` : String(day), total: 0, online: 0, local: 0 };
  });
}

async function loadProductSales(tenantId: string, start: Date, end: Date) {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: countedOrders(tenantId, start, end) },
    _sum: { quantity: true }
  });
  const sold = new Map(grouped.map((row) => [row.productId, row._sum.quantity || 0]));
  const products = await prisma.product.findMany({
    where: { tenantId, OR: [{ active: true }, { id: { in: Array.from(sold.keys()) } }] },
    select: { id: true, name: true, active: true }
  });
  const all: ProductSales[] = products.map((product) => ({ id: product.id, name: product.name, units: sold.get(product.id) || 0 }));
  const top = all.filter((product) => product.units > 0).sort((a, b) => b.units - a.units || a.name.localeCompare(b.name)).slice(0, 3);
  const activeIds = new Set(products.filter((product) => product.active).map((product) => product.id));
  // Lowest sellers, restricted to products that are currently offered and not already in the top 3.
  const topIds = new Set(top.map((product) => product.id));
  const low = all
    .filter((product) => activeIds.has(product.id) && !topIds.has(product.id))
    .sort((a, b) => a.units - b.units || a.name.localeCompare(b.name))
    .slice(0, 2);
  return { top, low };
}

async function loadPatterns(tenantId: string, today: string, currency: string) {
  const [hourly, monthlyRaw, firstDate] = await Promise.all([
    prisma.salesHourlyStat.groupBy({ by: ["dayOfWeek", "hour"], where: { tenantId }, _sum: { revenue: true } }),
    prisma.salesHourlyStat.groupBy({ by: ["year", "month", "source"], where: { tenantId }, _sum: { revenue: true, orders: true } }),
    prisma.salesHourlyStat.aggregate({ where: { tenantId }, _min: { date: true } })
  ]);

  const first = firstDate._min.date;
  const daysObserved = first ? diffDays(first, today) + 1 : 0;
  const occurrences = new Array<number>(7).fill(0);
  if (first) {
    for (let index = 0; index < daysObserved; index += 1) occurrences[weekdayOfKey(addDays(first, index))] += 1;
  }

  const weekdays: WeekdayPattern[] = [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const hours = new Array<number>(24).fill(0);
    for (const row of hourly) {
      if (row.dayOfWeek === weekday) hours[row.hour] = (row._sum.revenue || 0) / Math.max(occurrences[weekday], 1);
    }
    return { weekday, label: WEEKDAYS[weekday], hours, averageRevenue: hours.reduce((sum, value) => sum + value, 0) };
  });

  const monthMap = new Map<string, MonthlyTrend>();
  for (const row of monthlyRaw) {
    const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
    const entry = monthMap.get(key) || { key, label: monthKeyLabel(row.year, row.month), revenue: 0, orders: 0, online: 0, local: 0 };
    const revenue = row._sum.revenue || 0;
    entry.revenue += revenue;
    entry.orders += row._sum.orders || 0;
    if (row.source === "online") entry.online += revenue; else entry.local += revenue;
    monthMap.set(key, entry);
  }

  const currentMonth = `${today.slice(0, 7)}-01`;
  const monthly: MonthlyTrend[] = Array.from({ length: 12 }, (_, index) => {
    const key = shiftMonth(currentMonth, index - 11);
    const [year, month] = key.split("-").map(Number);
    return monthMap.get(key.slice(0, 7)) || { key: key.slice(0, 7), label: monthKeyLabel(year, month), revenue: 0, orders: 0, online: 0, local: 0 };
  });

  const insights: string[] = [];
  const activeWeekdays = weekdays.filter((day) => day.averageRevenue > 0);
  if (daysObserved < 14 || activeWeekdays.length === 0) {
    insights.push(`El sistema sigue aprendiendo de tus ventas (${daysObserved} ${daysObserved === 1 ? "día" : "días"} de historial). Los patrones serán más precisos con el tiempo.`);
  }
  if (activeWeekdays.length > 0) {
    const best = activeWeekdays.reduce((a, b) => (b.averageRevenue > a.averageRevenue ? b : a));
    const peakHour = best.hours.indexOf(Math.max(...best.hours));
    insights.push(`${best.label} suele ser tu día de mayor venta, con su pico entre las ${hourRangeText(peakHour)}.`);
    const overall = new Array<number>(24).fill(0);
    for (const day of weekdays) day.hours.forEach((value, hour) => { overall[hour] += value; });
    insights.push(`Tu mayor demanda de la semana se concentra entre las ${hourRangeText(overall.indexOf(Math.max(...overall)))}.`);
  }

  const withSales = Array.from(monthMap.values()).filter((entry) => entry.revenue > 0);
  if (withSales.length >= 2) {
    const byCalendarMonth = new Map<number, { sum: number; count: number }>();
    for (const entry of withSales) {
      const month = Number(entry.key.slice(5));
      const acc = byCalendarMonth.get(month) || { sum: 0, count: 0 };
      acc.sum += entry.revenue;
      acc.count += 1;
      byCalendarMonth.set(month, acc);
    }
    const [bestMonth] = Array.from(byCalendarMonth.entries()).sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count);
    insights.push(`Históricamente ${MONTHS_LONG[bestMonth[0] - 1]} es tu mes más fuerte.`);
  }
  const lastCompleted = shiftMonth(currentMonth, -1).slice(0, 7);
  const lastYear = shiftMonth(currentMonth, -13).slice(0, 7);
  const recent = monthMap.get(lastCompleted);
  const previousYear = monthMap.get(lastYear);
  if (recent && previousYear && previousYear.revenue > 0) {
    const change = Math.round(((recent.revenue - previousYear.revenue) / previousYear.revenue) * 100);
    const name = MONTHS_LONG[Number(lastCompleted.slice(5)) - 1];
    insights.push(change === 0
      ? `${name[0].toUpperCase()}${name.slice(1)} cerró igual que el año pasado (${money(recent.revenue, currency)}).`
      : `${name[0].toUpperCase()}${name.slice(1)} cerró ${Math.abs(change)}% ${change > 0 ? "arriba" : "abajo"} que el mismo mes del año pasado.`);
  }

  const months = Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  return { daysObserved, weekdays, monthly, insights, months, firstDate: first };
}

export async function getSalesDashboard(tenantId: string, period: SalesPeriod, anchor: string): Promise<SalesDashboardData> {
  await syncSalesStats(tenantId);

  const today = toDateKey(new Date());
  const { current, previous } = resolveRanges(period, anchor, today);
  const start = startOfDay(current.from);
  const end = startOfDay(addDays(current.to, 1));

  const restaurant = await prisma.restaurant.findFirst({ where: { tenantId }, select: { currency: true } });
  const currency = restaurant?.currency || "MXN";

  const [orders, previousAggregate, products, patterns] = await Promise.all([
    prisma.order.findMany({
      where: countedOrders(tenantId, start, end),
      select: { createdAt: true, source: true, total: true, items: { select: { quantity: true } } }
    }),
    prisma.order.aggregate({ where: countedOrders(tenantId, startOfDay(previous.from), startOfDay(addDays(previous.to, 1))), _sum: { total: true } }),
    loadProductSales(tenantId, start, end),
    loadPatterns(tenantId, today, currency)
  ]);

  const buckets = bucketsFor(period, current);
  const bucketIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));
  const hourTotals = new Array<number>(24).fill(0);
  const totals = { revenue: 0, online: 0, local: 0, orders: orders.length, units: 0, averageDaily: 0 };

  for (const order of orders) {
    const source = normalizeSource(order.source);
    const hour = getZonedParts(order.createdAt).hour;
    const bucket = buckets[bucketIndex.get(period === "day" ? String(hour) : toDateKey(order.createdAt)) ?? -1];
    if (bucket) {
      bucket.total += order.total;
      bucket[source] += order.total;
    }
    totals.revenue += order.total;
    totals[source] += order.total;
    totals.units += order.items.reduce((sum, item) => sum + item.quantity, 0);
    hourTotals[hour] += order.total;
  }

  const elapsedDays = today >= current.from && today <= current.to ? diffDays(current.from, today) + 1 : diffDays(current.from, current.to) + 1;
  totals.averageDaily = totals.revenue / Math.max(elapsedDays, 1);

  const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
  const subject = describeSubject(period, anchor, current, today);
  const rangeLabel = period === "day" ? formatKeyEs(anchor) : `${formatKeyEs(current.from)} – ${formatKeyEs(current.to)}`;

  return {
    period,
    anchor,
    today,
    rangeLabel,
    currency,
    chartUnit: period === "day" ? "hour" : "day",
    buckets,
    totals,
    insight: {
      summary: buildSummary({ period, subject, revenue: totals.revenue, previousRevenue: previousAggregate._sum.total || 0, currency }),
      peak: totals.revenue > 0 ? `El horario con mayor venta fue entre las ${hourRangeText(peakHour)}.` : null
    },
    topProducts: products.top,
    lowProducts: products.low,
    patterns: {
      daysObserved: patterns.daysObserved,
      weekdays: patterns.weekdays,
      monthly: patterns.monthly,
      insights: patterns.insights
    },
    history: {
      revenue: patterns.months.reduce((sum, month) => sum + month.revenue, 0),
      orders: patterns.months.reduce((sum, month) => sum + month.orders, 0),
      online: patterns.months.reduce((sum, month) => sum + month.online, 0),
      local: patterns.months.reduce((sum, month) => sum + month.local, 0),
      firstDate: patterns.firstDate,
      months: patterns.months
    }
  };
}
