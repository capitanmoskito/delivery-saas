"use client";

import { useEffect, useState } from "react";

const cartKey = "tupedidos_cart";
export const cartUpdatedEvent = "tupedidos:cart-updated";

type CartLine = { quantity: number };
type Cart = { lines: CartLine[] };

function readCartCount(): number {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(cartKey);
  if (!stored) return 0;
  try {
    const cart = JSON.parse(stored) as Cart;
    return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  } catch {
    return 0;
  }
}

export function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(readCartCount());

    function handleUpdate() {
      setCount(readCartCount());
    }

    window.addEventListener(cartUpdatedEvent, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(cartUpdatedEvent, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return count;
}
