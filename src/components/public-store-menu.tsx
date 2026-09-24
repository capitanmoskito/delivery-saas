"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Input } from "@/src/components/ui/input";
import { currencySymbols } from "@/src/lib/currency";
import { cartUpdatedEvent } from "@/src/hooks/use-cart-count";

type Variant = { id: string; name: string; price: number };
type Product = { id: string; name: string; description?: string | null; price: number; imageUrl?: string | null; categoryId: string; categoryName: string; variants: Variant[] };
type Package = { id: string; name: string; description?: string | null; price: number; imageUrl?: string | null };
type CartLine = { productId: string; name: string; price: number; quantity: number; additionIds: string[]; additions: Variant[] };

const cartKey = "tupedidos_cart";

function formatPrice(price: number, currency: keyof typeof currencySymbols) {
  return `${currencySymbols[currency] ?? "$"}${price.toFixed(2)}`;
}

export default function PublicStoreMenu({
  restaurantId,
  products,
  packages,
  favoriteProductIds,
  currency = "MXN",
}: {
  restaurantId: string;
  products: Product[];
  packages: Package[];
  favoriteProductIds: string[];
  currency?: keyof typeof currencySymbols;
}) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [additionIds, setAdditionIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => map.set(product.categoryId, product.categoryName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [products]);

  const favoriteProducts = useMemo(
    () => favoriteProductIds.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product)),
    [favoriteProductIds, products]
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = !activeCategory || product.categoryId === activeCategory;
      const matchesSearch = !term || product.name.toLowerCase().includes(term) || product.description?.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, activeCategory]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, { categoryName: string; products: Product[] }>();
    filteredProducts.forEach((product) => {
      const group = groups.get(product.categoryId) ?? { categoryName: product.categoryName, products: [] };
      group.products.push(product);
      groups.set(product.categoryId, group);
    });
    return Array.from(groups.values());
  }, [filteredProducts]);

  function openProduct(product: Product) {
    setSelectedProduct(product);
    setAdditionIds([]);
  }

  function addToCart() {
    if (!selectedProduct) return;
    const additions = selectedProduct.variants.filter((variant) => additionIds.includes(variant.id));
    const stored = window.localStorage.getItem(cartKey);
    const cart = stored ? (JSON.parse(stored) as { restaurantId: string; lines: CartLine[] }) : { restaurantId, lines: [] };
    const lines = cart.restaurantId === restaurantId ? cart.lines : [];
    const existing = lines.find((line) => line.productId === selectedProduct.id && line.additionIds.join(",") === additionIds.join(","));
    const nextLines = existing
      ? lines.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line))
      : [...lines, { productId: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.price, quantity: 1, additionIds, additions }];
    window.localStorage.setItem(cartKey, JSON.stringify({ restaurantId, lines: nextLines }));
    window.dispatchEvent(new Event(cartUpdatedEvent));
    setSelectedProduct(null);
    setAdditionIds([]);
  }

  return (
    <>
      {favoriteProducts.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pt-8">
          <h2 className="mb-4 text-2xl font-bold text-dark">Los favoritos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} currency={currency} onClick={() => openProduct(product)} />
            ))}
          </div>
        </section>
      )}

      {packages.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pt-8">
          <h2 className="mb-4 text-2xl font-bold text-dark">Paquetes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <div key={pkg.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="relative aspect-4/3 shrink-0 bg-slate-100">
                  {pkg.imageUrl ? (
                    <Image src={pkg.imageUrl} alt={pkg.name} fill unoptimized className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin imagen</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-bold text-dark">{pkg.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm">{pkg.description || "\u00A0"}</p>
                  <p className="mt-auto pt-3 font-semibold text-dark">{formatPrice(pkg.price, currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="mb-4 text-2xl font-bold text-dark">Menú</h2>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar en el menú..."
            className="h-10 sm:max-w-xs"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === null ? "bg-action text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === category.id ? "bg-action text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {groupedProducts.length === 0 && <p className="text-sm text-muted">No encontramos productos con esa búsqueda.</p>}

        <div className="space-y-8">
          {groupedProducts.map((group) => (
            <div key={group.categoryName}>
              {!activeCategory && <h3 className="mb-3 text-lg font-bold text-dark">{group.categoryName}</h3>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.products.map((product) => (
                  <ProductCard key={product.id} product={product} currency={currency} onClick={() => openProduct(product)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Link href="/cart" className="fixed right-5 bottom-5 rounded-full bg-action px-5 py-3 font-medium text-white shadow-lg">
        Ver carrito
      </Link>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-dark">{selectedProduct.name}</h2>
                <p className="mt-1 text-slate-600">{formatPrice(selectedProduct.price, currency)}</p>
              </div>
              <button type="button" onClick={() => setSelectedProduct(null)} className="text-slate-500">
                Cerrar
              </button>
            </div>

            {selectedProduct.variants.length > 0 && (
              <div className="mt-5">
                <p className="font-medium">Adicionales</p>
                <div className="mt-2 space-y-2">
                  {selectedProduct.variants.map((variant) => (
                    <label key={variant.id} className="flex items-center justify-between rounded border p-3">
                      <span>
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={additionIds.includes(variant.id)}
                          onChange={(event) =>
                            setAdditionIds((current) =>
                              event.target.checked ? [...current, variant.id] : current.filter((id) => id !== variant.id)
                            )
                          }
                        />
                        {variant.name}
                      </span>
                      <span>+{formatPrice(variant.price, currency)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button type="button" onClick={addToCart} className="mt-6 w-full rounded-full bg-action px-4 py-3 font-medium text-white">
              Agregar al carrito
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ProductCard({ product, currency, onClick }: { product: Product; currency: keyof typeof currencySymbols; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-4/3 shrink-0 bg-slate-100">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin imagen</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold text-dark">{product.name}</h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm">{product.description || "\u00A0"}</p>
        <p className="mt-auto pt-3 font-semibold text-dark">{formatPrice(product.price, currency)}</p>
      </div>
    </button>
  );
}