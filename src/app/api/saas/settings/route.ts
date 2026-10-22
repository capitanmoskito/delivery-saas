import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { isSuperAdmin } from "@/src/lib/require-super-admin";
import { getMonthlyPrice } from "@/src/modules/billing/subscription.service";

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ monthlyPrice: await getMonthlyPrice() });
}

export async function PUT(request: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const price = Number(data.monthlyPrice);
  if (!Number.isFinite(price) || price < 1 || price > 1_000_000) {
    return NextResponse.json({ error: "Ingresa un costo mensual válido (mínimo 1)." }, { status: 400 });
  }
  const monthlyPrice = Math.round(price * 100) / 100;

  const existing = await prisma.saaSSettings.findFirst({ select: { id: true } });
  if (existing) await prisma.saaSSettings.update({ where: { id: existing.id }, data: { subscriptionMonthlyPrice: monthlyPrice } });
  else await prisma.saaSSettings.create({ data: { subscriptionMonthlyPrice: monthlyPrice } });

  return NextResponse.json({ monthlyPrice });
}
