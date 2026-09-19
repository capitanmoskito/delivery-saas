"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Variant = { id: string; name: string; price: number };
type Product = { id: string; name: string; description?: string | null; price: number; imageUrl?: string | null; variants: Variant[] };
type CartLine = { productId: string; name: string; price: number; quantity: number; additionIds: string[]; additions: Variant[] };

const cartKey = "tupedidos_cart";

export default function PublicStoreMenu({ restaurantId, products }: { restaurantId: string; products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [additionIds, setAdditionIds] = useState<string[]>([]);

  function addToCart() {
    if (!selectedProduct) return;
    const additions = selectedProduct.variants.filter((variant) => additionIds.includes(variant.id));
    const stored = window.localStorage.getItem(cartKey);
    const cart = stored ? JSON.parse(stored) as { restaurantId: string; lines: CartLine[] } : { restaurantId, lines: [] };
    const lines = cart.restaurantId === restaurantId ? cart.lines : [];
    const existing = lines.find((line) => line.productId === selectedProduct.id && line.additionIds.join(",") === additionIds.join(","));
    const nextLines = existing ? lines.map((line) => line === existing ? { ...line, quantity: line.quantity + 1 } : line) : [...lines, { productId: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.price, quantity: 1, additionIds, additions }];
    window.localStorage.setItem(cartKey, JSON.stringify({ restaurantId, lines: nextLines }));
    setSelectedProduct(null);
    setAdditionIds([]);
  }

  return <>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <button key={product.id} type="button" onClick={() => { setSelectedProduct(product); setAdditionIds([]); }} className="overflow-hidden rounded border bg-white text-left"><div className="relative aspect-4/3 bg-slate-100">{product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin imagen</div>}</div><div className="p-4"><h2 className="font-bold">{product.name}</h2>{product.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{product.description}</p>}<p className="mt-3 font-semibold">${product.price.toFixed(2)}</p></div></button>)}</div>
    <Link href="/cart" className="fixed bottom-5 right-5 rounded bg-action px-5 py-3 font-medium text-white shadow-lg">Ver carrito</Link>
    {selectedProduct && <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center"><div className="w-full max-w-lg rounded-t-lg bg-white p-5 sm:rounded-lg"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{selectedProduct.name}</h2><p className="mt-1 text-slate-600">${selectedProduct.price.toFixed(2)}</p></div><button type="button" onClick={() => setSelectedProduct(null)} className="text-slate-500">Cerrar</button></div>{selectedProduct.variants.length > 0 && <div className="mt-5"><p className="font-medium">Adicionales</p><div className="mt-2 space-y-2">{selectedProduct.variants.map((variant) => <label key={variant.id} className="flex items-center justify-between rounded border p-3"><span><input type="checkbox" className="mr-2" checked={additionIds.includes(variant.id)} onChange={(event) => setAdditionIds((current) => event.target.checked ? [...current, variant.id] : current.filter((id) => id !== variant.id))} />{variant.name}</span><span>+${variant.price.toFixed(2)}</span></label>)}</div></div>}<button type="button" onClick={addToCart} className="mt-6 w-full rounded bg-action px-4 py-3 font-medium text-white">Agregar al carrito</button></div></div>}
  </>;
}