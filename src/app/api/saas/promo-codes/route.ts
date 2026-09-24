import { NextResponse } from "next/server";

import { PromoCodeService } from "@/src/modules/saas/promo-codes/promo-code.service";
import { getCurrentUser } from "@/src/lib/current-user";

export async function GET() {
  const service = new PromoCodeService();
  const promoCodes = await service.getAllPromoCodes();
  return NextResponse.json(promoCodes);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const service = new PromoCodeService();
    const promoCode = await service.createPromoCode(body);
    return NextResponse.json(promoCode, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al crear el código" }, { status: 400 });
  }
}
