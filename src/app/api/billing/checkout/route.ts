import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { BillingNotConfiguredError } from "@/src/modules/billing/billing-provider.factory";
import { createSubscriptionCheckout } from "@/src/modules/billing/subscription.service";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId || typeof user.email !== "string") {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const checkout = await createSubscriptionCheckout(user.tenantId, user.email);
    return NextResponse.json(checkout, { status: 201 });
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Error creating subscription checkout:", error);
    return NextResponse.json({ error: "No se pudo iniciar el pago. Intenta de nuevo." }, { status: 502 });
  }
}
