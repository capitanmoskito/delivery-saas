"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Cart = { restaurantId: string; lines: Array<{ productId: string; quantity: number; additionIds: string[] }> };

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => { const stored = window.localStorage.getItem("tupedidos_cart"); if (stored) setCart(JSON.parse(stored) as Cart); }, 0); return () => window.clearTimeout(timer); }, []);
  async function pay() { if (!cart) return; setLoading(true); const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restaurantId: cart.restaurantId, items: cart.lines }) }); const data: { error?: string; order?: { orderNumber: string } } = await response.json(); if (!response.ok) { setMessage(data.error || "No se pudo procesar el pago"); setLoading(false); return; } window.localStorage.removeItem("tupedidos_cart"); setMessage(`Pago registrado. Pedido ${data.order?.orderNumber || ""}`); setLoading(false); }
  return <main className="mx-auto max-w-xl p-6"><h1 className="text-3xl font-bold">Pagar pedido</h1><p className="mt-3 text-slate-600">Confirma tu compra con tarjeta. Antes de pagar debes iniciar sesión y completar tu perfil con dirección.</p>{message && <p className="mt-5 rounded border p-3">{message}</p>}<div className="mt-6 flex gap-3"><button type="button" disabled={!cart || loading} onClick={pay} className="rounded bg-action px-5 py-3 text-white disabled:bg-gray-400">{loading ? "Procesando..." : "Pagar"}</button><Link href="/customer/profile" className="rounded border px-5 py-3">Mi perfil</Link></div></main>;
}