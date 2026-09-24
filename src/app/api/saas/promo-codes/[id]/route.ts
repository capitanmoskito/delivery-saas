import { NextResponse } from "next/server";

import { PromoCodeService } from "@/src/modules/saas/promo-codes/promo-code.service";
import { getCurrentUser } from "@/src/lib/current-user";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const service = new PromoCodeService();
  const promoCode = await service.setActive(id, Boolean(body.active));
  return NextResponse.json(promoCode);
}
