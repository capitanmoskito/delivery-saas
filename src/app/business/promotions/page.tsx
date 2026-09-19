"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
};

type ProductRule = {
  product: Product;
  quantity: number;
};

type Promotion = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  discountType?: "percentage" | "fixed_amount" | null;
  discountPercent?: number | null;
  discountAmount?: number | null;
  startsAt: string;
  endsAt: string;
  targetProducts: Array<{ product: Product }>;
  requiredProducts: ProductRule[];
  freeProducts: ProductRule[];
  appliesToTakeawayDelivery: boolean;
  appliesToLocalOrders: boolean;
  appliesToCash: boolean;
  appliesToCard: boolean;
};

type DiscountType = "percentage" | "fixed_amount" | "free_product";

type PromotionForm = {
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  discountType: DiscountType;
  discountValue: string;
};

const emptyForm: PromotionForm = {
  name: "",
  description: "",
  startsAt: "",
  endsAt: "",
  discountType: "percentage",
  discountValue: ""
};

export default function PromotionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [targetProductIds, setTargetProductIds] = useState<string[]>([]);
  const [requiredProducts, setRequiredProducts] = useState<Record<string, number>>({});
  const [freeProducts, setFreeProducts] = useState<Record<string, number>>({});
  const [applicationOptions, setApplicationOptions] = useState({ takeawayDelivery: true, localOrders: false, cash: true, card: true });
  const [showApplicationOptions, setShowApplicationOptions] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState("");
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    const [productsResponse, promotionsResponse] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/promotions")
    ]);
    const productsData: unknown = await productsResponse.json();
    const promotionsData: unknown = await promotionsResponse.json();

    if (!productsResponse.ok || !Array.isArray(productsData)) {
      setError("No se pudieron cargar los productos");
      return;
    }

    if (!promotionsResponse.ok || !Array.isArray(promotionsData)) {
      setError("No se pudieron cargar las promociones");
      return;
    }

    setProducts(productsData as Product[]);
    setPromotions(promotionsData as Promotion[]);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [productsResponse, promotionsResponse] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/promotions")
        ]);
        const productsData: unknown = await productsResponse.json();
        const promotionsData: unknown = await promotionsResponse.json();

        if (!active) {
          return;
        }

        if (!productsResponse.ok || !Array.isArray(productsData)) {
          setError("No se pudieron cargar los productos");
          return;
        }

        if (!promotionsResponse.ok || !Array.isArray(promotionsData)) {
          setError("No se pudieron cargar las promociones");
          return;
        }

        setProducts(productsData as Product[]);
        setPromotions(promotionsData as Promotion[]);
      } catch {
        if (active) {
          setError("No se pudo conectar con el servidor");
        }
      }
    }

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

  function updateRule(
    setRules: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    productId: string,
    quantity: number
  ) {
    setRules((current) => {
      const next = { ...current };

      if (quantity < 1) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }

      return next;
    });
  }

  function toggleTargetProduct(productId: string) {
    setTargetProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]
    );
  }

  function resetForm() {
    setForm(emptyForm);
    setTargetProductIds([]);
    setRequiredProducts({});
    setFreeProducts({});
    setApplicationOptions({ takeawayDelivery: true, localOrders: false, cash: true, card: true });
    setShowApplicationOptions(false);
    setFile(null);
    setSavedImageUrl("");
    setEditingPromotionId(null);
    setShowForm(false);
    setError("");
  }

  function editPromotion(promotion: Promotion) {
    setForm({
      name: promotion.name,
      description: promotion.description || "",
      startsAt: promotion.startsAt.slice(0, 16),
      endsAt: promotion.endsAt.slice(0, 16),
      discountType: promotion.discountType || "free_product",
      discountValue: String(promotion.discountPercent || promotion.discountAmount || "")
    });
    setTargetProductIds(promotion.targetProducts.map((item) => item.product.id));
    setRequiredProducts(Object.fromEntries(
      promotion.requiredProducts.map((item) => [item.product.id, item.quantity])
    ));
    setFreeProducts(Object.fromEntries(
      promotion.freeProducts.map((item) => [item.product.id, item.quantity])
    ));
    setApplicationOptions({ takeawayDelivery: promotion.appliesToTakeawayDelivery, localOrders: promotion.appliesToLocalOrders, cash: promotion.appliesToCash, card: promotion.appliesToCard });
    setShowApplicationOptions(false);
    setFile(null);
    setSavedImageUrl(promotion.imageUrl || "");
    setEditingPromotionId(promotion.id);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePromotion() {
    setError("");
    setSaving(true);

    try {
      let imageUrl = savedImageUrl;

      if (file) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("kind", "promotion");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData
        });
        const uploadData: { success?: boolean; url?: string; message?: string } = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadData.success || !uploadData.url) {
          setError(uploadData.message || "No se pudo subir la imagen");
          return;
        }

        imageUrl = uploadData.url;
      }

      const response = await fetch("/api/promotions", {
        method: editingPromotionId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPromotionId,
          ...form,
          discountValue: Number(form.discountValue),
          imageUrl,
          targetProductIds,
          requiredProducts: Object.entries(requiredProducts).map(([productId, quantity]) => ({ productId, quantity })),
          freeProducts: Object.entries(freeProducts).map(([productId, quantity]) => ({ productId, quantity }))
          ,
          appliesToTakeawayDelivery: applicationOptions.takeawayDelivery,
          appliesToLocalOrders: applicationOptions.localOrders,
          appliesToCash: applicationOptions.cash,
          appliesToCard: applicationOptions.card
        })
      });
      const data: { error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo guardar la promoción");
        return;
      }

      resetForm();
      await loadData();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  const previewUrl = file ? URL.createObjectURL(file) : savedImageUrl;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Promociones</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded bg-action px-4 py-2 text-white"
        >
          Nueva promoción
        </button>
      </div>

      {showForm && (
        <section className="mt-6 space-y-5 rounded border p-4">
          <h2 className="text-xl font-semibold">
            {editingPromotionId ? "Editar promoción" : "Nueva promoción"}
          </h2>

          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="w-full border p-2"
            placeholder="Nombre de la promoción"
          />

          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="min-h-28 w-full border p-2"
            placeholder="Descripción de la promoción"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Fecha de inicio
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                className="mt-1 w-full border p-2"
              />
            </label>
            <label className="text-sm font-medium">
              Fecha de finalización
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                className="mt-1 w-full border p-2"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={form.discountType}
              onChange={(event) => setForm({ ...form, discountType: event.target.value as DiscountType })}
              className="border p-2"
            >
              <option value="percentage">Descuento porcentual</option>
              <option value="fixed_amount">Descuento por monto</option>
              <option value="free_product">Producto gratuito</option>
            </select>
            {form.discountType !== "free_product" && (
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discountValue}
                onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
                className="border p-2"
                placeholder={form.discountType === "percentage" ? "Porcentaje" : "Monto de descuento"}
              />
            )}
          </div>

          <label
            className="relative flex h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-slate-50"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const droppedFile = event.dataTransfer.files[0];

              if (droppedFile) {
                setFile(droppedFile);
              }
            }}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {previewUrl ? (
              <Image src={previewUrl} alt="Vista previa de la promoción" fill unoptimized className="object-cover" />
            ) : (
              <>
                <p className="font-medium">Arrastra aquí la imagen de la promoción</p>
                <p className="text-sm text-gray-500">o selecciona una desde tu equipo</p>
              </>
            )}
          </label>

          <p className="text-xs text-gray-500">Máximo 5 MB. PNG, JPG o WEBP.</p>

          <div>
            <button type="button" onClick={() => setShowApplicationOptions((current) => !current)} className="rounded border px-4 py-2">
              Opciones de aplicación
            </button>
          </div>

          {showApplicationOptions && <div className="rounded border p-4">
            <h3 className="font-semibold">Aplica en</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={applicationOptions.takeawayDelivery} onChange={(event) => setApplicationOptions((current) => ({ ...current, takeawayDelivery: event.target.checked }))} />Pedidos para llevar o envío</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={applicationOptions.localOrders} onChange={(event) => setApplicationOptions((current) => ({ ...current, localOrders: event.target.checked }))} />Pedidos en local</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={applicationOptions.cash} onChange={(event) => setApplicationOptions((current) => ({ ...current, cash: event.target.checked }))} />Pagos en efectivo</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={applicationOptions.card} onChange={(event) => setApplicationOptions((current) => ({ ...current, card: event.target.checked }))} />Pagos con tarjeta</label>
            </div>
          </div>}

          {form.discountType !== "free_product" && (
            <ProductSelection
              title="Productos a los que aplica el descuento"
              products={products}
              selectedProductIds={targetProductIds}
              onToggle={toggleTargetProduct}
            />
          )}

          <ProductRuleSelection
            title="Productos requeridos"
            helpText="El cliente debe cumplir estas cantidades para activar la promoción."
            products={products}
            rules={requiredProducts}
            onChange={(productId, quantity) => updateRule(setRequiredProducts, productId, quantity)}
          />

          <ProductRuleSelection
            title="Productos gratuitos"
            helpText="Se agregarán al resultado del carrito con precio $0 cuando se cumplan los requisitos."
            products={products}
            rules={freeProducts}
            onChange={(productId, quantity) => updateRule(setFreeProducts, productId, quantity)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="button"
              onClick={savePromotion}
              disabled={saving || !form.name.trim() || !form.startsAt || !form.endsAt}
              className="rounded bg-action px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? "Guardando..." : editingPromotionId ? "Guardar cambios" : "Crear promoción"}
            </button>
            <button type="button" onClick={resetForm} className="ml-2 rounded border px-4 py-2">
              Cancelar
            </button>
          </div>
        </section>
      )}

      {error && !showForm && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {promotions.map((promotion) => (
          <article key={promotion.id} className="overflow-hidden rounded border bg-white">
            {promotion.imageUrl ? (
              <div className="relative aspect-4/3">
                <Image src={promotion.imageUrl} alt={promotion.name} fill unoptimized className="object-cover" />
              </div>
            ) : (
              <div className="flex aspect-4/3 items-center justify-center bg-slate-100 text-sm text-slate-500">
                Sin imagen
              </div>
            )}
            <div className="p-4">
              <h2 className="font-bold">{promotion.name}</h2>
              {promotion.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{promotion.description}</p>}
              <p>{promotionLabel(promotion)}</p>
              <p className="mt-2 text-sm text-slate-600">
                {new Date(promotion.startsAt).toLocaleDateString("es-MX")} - {new Date(promotion.endsAt).toLocaleDateString("es-MX")}
              </p>
              {promotion.requiredProducts.length > 0 && (
                <p className="mt-2 text-sm text-slate-600">
                  Requiere: {promotion.requiredProducts.map((item) => `${item.quantity}x ${item.product.name}`).join(", ")}
                </p>
              )}
              {promotion.freeProducts.length > 0 && (
                <p className="mt-2 text-sm text-slate-600">
                  Gratis: {promotion.freeProducts.map((item) => `${item.quantity}x ${item.product.name}`).join(", ")}
                </p>
              )}
              <button
                type="button"
                onClick={() => editPromotion(promotion)}
                className="mt-4 rounded bg-action px-4 py-2 text-white"
              >
                Editar
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function ProductSelection({
  title,
  products,
  selectedProductIds,
  onToggle
}: {
  title: string;
  products: Product[];
  selectedProductIds: string[];
  onToggle: (productId: string) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {products.map((product) => (
          <label key={product.id} className="flex items-center gap-3 rounded border p-3">
            <input
              type="checkbox"
              checked={selectedProductIds.includes(product.id)}
              onChange={() => onToggle(product.id)}
            />
            <span className="min-w-0 flex-1 truncate font-medium">{product.name}</span>
            <span className="text-sm text-slate-500">${product.price.toFixed(2)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ProductRuleSelection({
  title,
  helpText,
  products,
  rules,
  onChange
}: {
  title: string;
  helpText: string;
  products: Product[];
  rules: Record<string, number>;
  onChange: (productId: string, quantity: number) => void;
}) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{helpText}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {products.map((product) => {
          const quantity = rules[product.id] || 0;

          return (
            <div key={product.id} className="flex items-center gap-3 rounded border p-3">
              <input
                type="checkbox"
                checked={quantity > 0}
                onChange={(event) => onChange(product.id, event.target.checked ? 1 : 0)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-sm text-slate-500">${product.price.toFixed(2)}</p>
              </div>
              {quantity > 0 && (
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => onChange(product.id, Number(event.target.value))}
                  className="w-16 border p-2"
                  aria-label={`Cantidad de ${product.name}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function promotionLabel(promotion: Promotion): string {
  if (promotion.discountType === "percentage") {
    return `${promotion.discountPercent || 0}% de descuento`;
  }

  if (promotion.discountType === "fixed_amount") {
    return `$${(promotion.discountAmount || 0).toFixed(2)} de descuento`;
  }

  return "Producto gratuito";
}