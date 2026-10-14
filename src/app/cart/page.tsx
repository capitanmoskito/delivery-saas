"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Minus, Plus, X } from "lucide-react";

import MarketplaceHeader from "@/src/components/marketplace-header";
import OrderTracker, { type TrackedOrder } from "@/src/components/tracking/order-tracker";
import { currencySymbols } from "@/src/lib/currency";
import { addLineToCart, readCart, writeCart, type CartAddition, type StoredCart } from "@/src/lib/cart";

type Favorite = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  variants: CartAddition[];
};
type UpsellData = { businessName: string; currency: keyof typeof currencySymbols; favorites: Favorite[] };

function lineTotal(line: StoredCart["lines"][number]) {
  return (line.price + line.additions.reduce((sum, addition) => sum + addition.price, 0)) * line.quantity;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<StoredCart | null>(null);
  const [upsell, setUpsell] = useState<UpsellData | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [optionsFor, setOptionsFor] = useState<Favorite | null>(null);
  const [additionIds, setAdditionIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [trackedOrders, setTrackedOrders] = useState<TrackedOrder[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCart(readCart()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      const response = await fetch("/api/customer/orders").catch(() => null);
      if (cancelled || !response?.ok) return;
      const data = (await response.json()) as { orders: TrackedOrder[] };
      setTrackedOrders(data.orders);

      // A cart whose pending order was already accepted is stale: the order lives in the tracker now.
      const stored = readCart();
      const settled = stored?.pendingOrderId ? data.orders.find((order) => order.id === stored.pendingOrderId && order.status !== "pending_payment") : undefined;
      if (stored && settled) {
        window.localStorage.removeItem("tupedidos_cart");
        window.dispatchEvent(new Event("tupedidos:cart-updated"));
        setCart(null);
      }
    }
    void loadOrders();
    const interval = window.setInterval(() => void loadOrders(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [reload]);

  const restaurantId = cart?.restaurantId;
  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    fetch(`/api/store/${restaurantId}/upsell`)
      .then((response) => (response.ok ? (response.json() as Promise<UpsellData>) : null))
      .then((data) => {
        if (!cancelled && data) setUpsell(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const currency = upsell?.currency ?? "MXN";
  const symbol = currencySymbols[currency] ?? "$";
  const total = cart?.lines.reduce((sum, line) => sum + lineTotal(line), 0) || 0;
  const locked = Boolean(cart?.pendingOrderId);

  const suggestions = useMemo(() => {
    const inCart = new Set(cart?.lines.map((line) => line.productId) ?? []);
    return (upsell?.favorites ?? []).filter((favorite) => !inCart.has(favorite.id)).slice(0, 4);
  }, [cart, upsell]);

  function removeLine(index: number) {
    if (!cart || locked) return;
    const next = { ...cart, lines: cart.lines.filter((_, lineIndex) => lineIndex !== index) };
    writeCart(next);
    setCart(next);
  }

  function setQuantity(index: number, quantity: number) {
    if (!cart || locked || !Number.isFinite(quantity)) return;
    const next = { ...cart, lines: cart.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, quantity: Math.min(99, Math.max(1, Math.trunc(quantity))) } : line)) };
    writeCart(next);
    setCart(next);
  }

  function handleContinue() {
    if (suggestions.length === 0) {
      router.push("/checkout");
      return;
    }
    setError("");
    setUpsellOpen(true);
  }

  function addFavorite(favorite: Favorite, selectedIds: string[]) {
    if (!cart) return;
    const additions = favorite.variants.filter((variant) => selectedIds.includes(variant.id));
    const message = addLineToCart(cart.restaurantId, { productId: favorite.id, name: favorite.name, price: favorite.price, quantity: 1, additionIds: selectedIds, additions });
    if (message) {
      setError(message);
      return;
    }
    setCart(readCart());
    setOptionsFor(null);
    setAdditionIds([]);
  }

  return (
    <>
      <MarketplaceHeader />
      <main className="mx-auto max-w-3xl p-6">
        <Link
          href={cart?.restaurantId ? `/store/${cart.restaurantId}` : "/"}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-dark"
        >
          <ChevronLeft size={18} /> Regresar
        </Link>
        {upsell?.businessName && cart?.lines.length ? <p className="mt-4 text-sm font-semibold text-action">{upsell.businessName}</p> : null}
        <OrderTracker orders={trackedOrders} onChanged={() => setReload((value) => value + 1)} />
        <h1 className="mt-6 text-3xl font-bold">Carrito</h1>
        {!cart?.lines.length ? (
          <p className="mt-6 text-slate-600">Tu carrito está vacío.</p>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              {cart.lines.map((line, index) => (
                <div key={`${line.packageId ?? line.productId}-${index}`} className="flex items-start justify-between gap-3 rounded border p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      disabled={locked}
                      aria-label={`Eliminar ${line.name}`}
                      className="mt-0.5 rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                    >
                      <X size={16} />
                    </button>
                    <div>
                      <p className="font-medium">{line.quantity}x {line.name}</p>
                      {line.additions.length > 0 && (
                        <p className="text-sm text-slate-500">{line.additions.map((addition) => addition.name).join(", ")}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-medium">{symbol}{lineTotal(line).toFixed(2)}</span>
                    <div className="flex items-center overflow-hidden rounded-full border border-border">
                      <button type="button" onClick={() => setQuantity(index, line.quantity - 1)} disabled={locked || line.quantity <= 1} aria-label={`Quitar una unidad de ${line.name}`} className="px-2.5 py-1 hover:bg-slate-100 disabled:opacity-40">
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={line.quantity}
                        disabled={locked}
                        onChange={(event) => setQuantity(index, Number(event.target.value))}
                        aria-label={`Cantidad de ${line.name}`}
                        className="w-10 [appearance:textfield] bg-transparent text-center text-sm font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button type="button" onClick={() => setQuantity(index, line.quantity + 1)} disabled={locked || line.quantity >= 99} aria-label={`Agregar una unidad de ${line.name}`} className="px-2.5 py-1 hover:bg-slate-100 disabled:opacity-40">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-right text-xl font-bold">Total: {symbol}{total.toFixed(2)}</p>
            <button type="button" onClick={handleContinue} className="mt-5 inline-block rounded bg-action px-5 py-3 text-white">
              Continuar al pago
            </button>
          </>
        )}
      </main>

      {upsellOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-dark">¿Se te antoja algo más?</h2>
              <button type="button" onClick={() => { setUpsellOpen(false); setOptionsFor(null); }} className="text-slate-500">
                Cerrar
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-600">Los favoritos de {upsell?.businessName}</p>

            {error && <p role="alert" className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="mt-4 space-y-3">
              {suggestions.map((favorite) => (
                <div key={favorite.id} className="rounded-2xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {favorite.imageUrl && <Image src={favorite.imageUrl} alt={favorite.name} fill unoptimized className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-dark">{favorite.name}</p>
                      <p className="text-sm text-slate-600">{symbol}{favorite.price.toFixed(2)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (favorite.variants.length > 0) {
                          setOptionsFor(optionsFor?.id === favorite.id ? null : favorite);
                          setAdditionIds([]);
                        } else {
                          addFavorite(favorite, []);
                        }
                      }}
                      className="rounded-full bg-action px-4 py-2 text-sm font-medium text-white"
                    >
                      Agregar
                    </button>
                  </div>

                  {optionsFor?.id === favorite.id && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Complementos</p>
                      {favorite.variants.map((variant) => (
                        <label key={variant.id} className="flex items-center justify-between rounded border p-2 text-sm">
                          <span>
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={additionIds.includes(variant.id)}
                              onChange={(event) => setAdditionIds((current) => (event.target.checked ? [...current, variant.id] : current.filter((id) => id !== variant.id)))}
                            />
                            {variant.name}
                          </span>
                          <span>+{symbol}{variant.price.toFixed(2)}</span>
                        </label>
                      ))}
                      <button type="button" onClick={() => addFavorite(favorite, additionIds)} className="w-full rounded-full bg-action px-4 py-2 text-sm font-medium text-white">
                        Agregar al carrito
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {suggestions.length === 0 && <p className="text-sm text-slate-600">Ya agregaste todos nuestros favoritos.</p>}
            </div>

            <button type="button" onClick={() => router.push("/checkout")} className="mt-5 w-full rounded-full border border-border px-4 py-3 font-medium text-dark">
              No gracias, continuar con el pago
            </button>
          </div>
        </div>
      )}
    </>
  );
}
