import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { buildCheckoutQuote, CheckoutQuoteError, type CheckoutItemInput } from "@/src/modules/payments/checkout-quote";

type SessionUser = { id?: unknown; role?: unknown } | null;

function normalizeItems(value: unknown): CheckoutItemInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId : "";
    const quantity = Number(item.quantity);
    const additionIds = Array.isArray(item.additionIds) ? item.additionIds.filter((id): id is string => typeof id === "string") : [];
    return productId && Number.isInteger(quantity) ? [{ productId, quantity, additionIds }] : [];
  });
}

export async function POST(request: Request) {
  const session = (await getCurrentUser()) as SessionUser;
  if (typeof session?.id !== "string" || session.role !== "customer") {
    return NextResponse.json({ error: "Inicia sesión con tu cuenta de cliente para continuar." }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const paymentMethod = data.paymentMethod === "transfer" ? "transfer" : "card";
    const quote = await buildCheckoutQuote({
      restaurantId: String(data.restaurantId ?? ""),
      items: normalizeItems(data.items),
      discountCode: String(data.discountCode ?? ""),
      paymentMethod,
      userId: session.id,
    });

    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof CheckoutQuoteError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error("Checkout quote error:", error);
    return NextResponse.json({ error: "No se pudo calcular el total del pedido." }, { status: 500 });
  }
}
