"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CartLine = { productId: string; name: string; price: number; quantity: number; additionIds: string[]; additions: Array<{ name: string; price: number }> };
type Cart = { restaurantId: string; lines: CartLine[] };

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => { const stored = window.localStorage.getItem("tupedidos_cart"); if (stored) setCart(JSON.parse(stored) as Cart); }, 0); return () => window.clearTimeout(timer); }, []);
  const total = cart?.lines.reduce((sum, line) => sum + (line.price + line.additions.reduce((additionTotal, addition) => additionTotal + addition.price, 0)) * line.quantity, 0) || 0;
  return <main className="mx-auto max-w-3xl p-6"><h1 className="text-3xl font-bold">Carrito</h1>{!cart?.lines.length ? <p className="mt-6 text-slate-600">Tu carrito está vacío.</p> : <><div className="mt-6 space-y-3">{cart.lines.map((line, index) => <div key={`${line.productId}-${index}`} className="flex justify-between rounded border p-4"><div><p className="font-medium">{line.quantity}x {line.name}</p>{line.additions.length > 0 && <p className="text-sm text-slate-500">{line.additions.map((addition) => addition.name).join(", ")}</p>}</div><span>${((line.price + line.additions.reduce((additionTotal, addition) => additionTotal + addition.price, 0)) * line.quantity).toFixed(2)}</span></div>)}</div><p className="mt-5 text-right text-xl font-bold">Total: ${total.toFixed(2)}</p><Link href="/checkout" className="mt-5 inline-block rounded bg-action px-5 py-3 text-white">Continuar al pago</Link></>}</main>;
}