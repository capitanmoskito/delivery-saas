import { cartUpdatedEvent } from "@/src/hooks/use-cart-count";

export type CartAddition = { id: string; name: string; price: number };
export type CartLine = {
  productId: string;
  packageId?: string;
  name: string;
  price: number;
  quantity: number;
  additionIds: string[];
  additions: CartAddition[];
};
export type StoredCart = {
  restaurantId: string;
  lines: CartLine[];
  pendingOrderId?: string;
  pendingOrderNumber?: string;
  pendingPaymentMethod?: "card" | "transfer";
  pendingPaymentUrl?: string;
};

export const cartKey = "tupedidos_cart";

export function readCart(): StoredCart | null {
  const stored = window.localStorage.getItem(cartKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as StoredCart;
  } catch {
    return null;
  }
}

export function writeCart(cart: StoredCart) {
  window.localStorage.setItem(cartKey, JSON.stringify(cart));
  window.dispatchEvent(new Event(cartUpdatedEvent));
}

function sameLine(line: CartLine, candidate: CartLine) {
  return line.productId === candidate.productId
    && (line.packageId ?? "") === (candidate.packageId ?? "")
    && line.additionIds.join(",") === candidate.additionIds.join(",");
}

// Returns an error message when the line cannot be added, otherwise null.
export function addLineToCart(restaurantId: string, line: CartLine): string | null {
  const cart = readCart() ?? { restaurantId, lines: [] };
  if (cart.pendingOrderId) return "Ya tienes un pedido pendiente. Completa su pago antes de modificar el carrito.";
  if (cart.restaurantId !== restaurantId && cart.lines.length > 0) {
    return "Tu carrito ya contiene productos de otro negocio. Finaliza ese pedido antes de pedir en otro negocio.";
  }
  const lines = cart.restaurantId === restaurantId ? cart.lines : [];
  const existing = lines.find((current) => sameLine(current, line));
  const nextLines = existing
    ? lines.map((current) => (current === existing ? { ...current, quantity: current.quantity + 1 } : current))
    : [...lines, line];
  writeCart({ restaurantId, lines: nextLines });
  return null;
}
