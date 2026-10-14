import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true, name: true, tenantId: true, currency: true, active: true },
  });
  if (!restaurant || !restaurant.active) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const [profile, groups] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { tenantId: restaurant.tenantId }, select: { businessName: true } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { tenantId: restaurant.tenantId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 12,
    }),
  ]);

  const products = await prisma.product.findMany({
    where: { tenantId: restaurant.tenantId, active: true, id: { in: groups.map((group) => group.productId) } },
    include: { variants: { where: { active: true }, select: { id: true, name: true, price: true } } },
  });
  const favorites = groups
    .map((group) => products.find((product) => product.id === group.productId))
    .filter((product): product is (typeof products)[number] => Boolean(product))
    .map((product) => ({ id: product.id, name: product.name, description: product.description, price: product.price, imageUrl: product.imageUrl, variants: product.variants }));

  return NextResponse.json({ businessName: profile?.businessName || restaurant.name, currency: restaurant.currency, favorites });
}
