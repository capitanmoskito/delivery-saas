import { prisma } from "@/src/lib/prisma";

export type MonthKey = string;

export type RevenueStats = {
  from: MonthKey;
  to: MonthKey;
  months: Array<{ month: MonthKey; amount: number }>;
  currency: string;
  totals: Array<{ currency: string; amount: number }>;
  paymentCount: number;
  payingTenants: number;
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonth(): MonthKey {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonth(value: string | undefined, fallback: MonthKey): MonthKey {
  return value && MONTH_PATTERN.test(value) ? value : fallback;
}

function monthStart(month: MonthKey) {
  const [year, number] = month.split("-").map(Number);
  return new Date(year, number - 1, 1);
}

function addMonths(month: MonthKey, amount: number): MonthKey {
  const date = monthStart(month);
  date.setMonth(date.getMonth() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function defaultFromMonth() {
  return addMonths(currentMonth(), -5);
}

export async function getRevenueStats(fromInput: MonthKey, toInput: MonthKey): Promise<RevenueStats> {
  const [from, to] = fromInput <= toInput ? [fromInput, toInput] : [toInput, fromInput];
  const payments = await prisma.subscriptionPayment.findMany({
    where: { status: "paid", paidAt: { gte: monthStart(from), lt: monthStart(addMonths(to, 1)) } },
    select: { tenantId: true, amount: true, currency: true, paidAt: true }
  });

  const totalsByCurrency = new Map<string, number>();
  for (const payment of payments) totalsByCurrency.set(payment.currency, (totalsByCurrency.get(payment.currency) ?? 0) + payment.amount);
  const totals = Array.from(totalsByCurrency, ([currency, amount]) => ({ currency, amount })).sort((a, b) => b.amount - a.amount);
  const currency = totals[0]?.currency ?? "MXN";

  const perMonth = new Map<MonthKey, number>();
  for (const payment of payments) {
    if (!payment.paidAt || payment.currency !== currency) continue;
    const key = `${payment.paidAt.getFullYear()}-${String(payment.paidAt.getMonth() + 1).padStart(2, "0")}`;
    perMonth.set(key, (perMonth.get(key) ?? 0) + payment.amount);
  }

  const months: RevenueStats["months"] = [];
  for (let month = from; month <= to && months.length < 60; month = addMonths(month, 1)) {
    months.push({ month, amount: perMonth.get(month) ?? 0 });
  }

  return { from, to, months, currency, totals, paymentCount: payments.length, payingTenants: new Set(payments.map((payment) => payment.tenantId)).size };
}
