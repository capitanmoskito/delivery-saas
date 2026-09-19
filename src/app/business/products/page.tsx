"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  category?: Category;
  variants: ProductVariant[];
};

type ProductVariant = {
  id?: string;
  name: string;
  price: number;
};

type ProductForm = {
  name: string;
  categoryId: string;
  price: string;
  description: string;
  variants: Array<{
    name: string;
    price: string;
  }>;
};

type ApiError = {
  error?: string;
};

const emptyForm: ProductForm = {
  name: "",
  categoryId: "",
  price: "",
  description: "",
  variants: []
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const [productsResponse, categoriesResponse] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories")
    ]);
    const productsData = await readJson<Product[] | ApiError>(productsResponse, []);
    const categoriesData = await readJson<Category[] | ApiError>(categoriesResponse, []);

    if (!productsResponse.ok) {
      setError(
        "error" in productsData
          ? productsData.error || "No se pudieron cargar los productos"
          : "No se pudieron cargar los productos"
      );
      return;
    }

    if (!Array.isArray(productsData)) {
      setError(productsData.error || "No se pudieron cargar los productos");
      return;
    }

    if (!Array.isArray(categoriesData)) {
      setError(categoriesData.error || "No se pudieron cargar las categorías");
      return;
    }

    setProducts(productsData);
    setCategories(categoriesData);
  }

  async function readJson<T>(response: Response, fallback: T): Promise<T> {
    const text = await response.text();

    if (!text.trim()) {
      return fallback;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  }

  async function saveProduct() {
    setError("");
    setSaving(true);

    try {
      let imageUrl = savedImageUrl;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("kind", "product");
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadData.success) {
          setError(uploadData.message || "No se pudo subir la imagen");
          return;
        }

        imageUrl = uploadData.url;
      }

      const response = await fetch("/api/products", {
        method: editingProductId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingProductId,
          name: form.name,
          categoryId: form.categoryId,
          price: Number(form.price),
          description: form.description,
          imageUrl,
          variants: form.variants
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo guardar el producto");
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

  function resetForm() {
    setForm({ ...emptyForm });
    setFile(null);
    setSavedImageUrl("");
    setEditingProductId(null);
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setSavedImageUrl(product.imageUrl || "");
    setFile(null);
    setForm({
      name: product.name,
      categoryId: product.category?.id || "",
      price: String(product.price),
      description: product.description || "",
      variants: product.variants.map((variant) => ({
        name: variant.name,
        price: String(variant.price)
      }))
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    void loadData();
  }, []);

  const previewUrl = file ? URL.createObjectURL(file) : savedImageUrl;

  function updateVariant(index: number, field: "name" | "price", value: string) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      )
    }));
  }

  function addVariant() {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, { name: "", price: "0" }]
    }));
  }

  function removeVariant(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index)
    }));
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Productos</h1>

      <div className="mb-8 space-y-3 rounded border p-4">
        <h2 className="text-xl font-semibold">
          {editingProductId ? "Editar producto" : "Nuevo producto"}
        </h2>

        <input
          placeholder="Nombre producto"
          className="w-full border p-2"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />

        <select
          className="w-full border p-2"
          value={form.categoryId}
          onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
        >
          <option value="">Selecciona categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio"
          className="w-full border p-2"
          value={form.price}
          onChange={(event) => setForm({ ...form, price: event.target.value })}
        />

        <textarea
          placeholder="Descripción completa del producto"
          className="min-h-28 w-full border p-2"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          maxLength={1000}
        />

        <label
          className="relative flex h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-slate-50"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const droppedFile = event.dataTransfer.files[0];
            if (droppedFile) setFile(droppedFile);
          }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          {previewUrl ? (
            <Image src={previewUrl} alt="Vista previa del producto" fill unoptimized className="object-cover" />
          ) : (
            <>
              <p className="font-medium">Arrastra aquí tu imagen</p>
              <p className="text-sm text-gray-500">o selecciona una desde tu equipo</p>
            </>
          )}
        </label>

        <p className="text-xs text-gray-500">Máximo 5 MB. PNG, JPG o WEBP.</p>

        <div className="space-y-3 rounded border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Adicionales del producto</h3>
              <p className="text-sm text-slate-500">
                Agrega opciones que el cliente podrá seleccionar por separado.
              </p>
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="rounded border px-3 py-2 text-sm"
            >
              Agregar adicional
            </button>
          </div>

          {form.variants.map((variant, index) => (
            <div key={`variant-${index}`} className="flex flex-col gap-2 sm:flex-row">
              <input
                className="flex-1 border p-2"
                placeholder="Ej. Salsa verde"
                value={variant.name}
                onChange={(event) => updateVariant(index, "name", event.target.value)}
              />
              <input
                className="w-full border p-2 sm:w-36"
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio extra"
                value={variant.price}
                onChange={(event) => updateVariant(index, "price", event.target.value)}
              />
              <button
                type="button"
                onClick={() => removeVariant(index)}
                className="rounded border border-red-200 px-3 py-2 text-red-600"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={saveProduct}
          disabled={saving || !form.name.trim() || !form.categoryId || !form.price}
          className="rounded bg-action px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {saving ? "Guardando..." : editingProductId ? "Guardar cambios" : "Crear producto"}
        </button>

        {editingProductId && (
          <button type="button" onClick={resetForm} className="ml-2 rounded border px-4 py-2">
            Cancelar
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="overflow-hidden rounded border bg-white">
            {product.imageUrl ? (
              <div className="relative aspect-4/3">
                <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-cover" />
              </div>
            ) : (
              <div className="flex aspect-4/3 items-center justify-center bg-slate-100 text-sm text-slate-500">
                Sin imagen
              </div>
            )}
            <div className="p-4">
              <h2 className="font-bold">{product.name}</h2>
              {product.description && (
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                  {product.description}
                </p>
              )}
              <p>Categoría: {product.category?.name || "Sin categoría"}</p>
              <p>Precio: ${product.price.toFixed(2)}</p>
              {product.variants.length > 0 && (
                <div className="mt-3 text-sm">
                  <p className="font-semibold">Adicionales:</p>
                  <ul className="list-disc pl-5 text-slate-600">
                    {product.variants.map((variant) => (
                      <li key={variant.id || variant.name}>
                        {variant.name}{variant.price > 0 ? ` (+$${variant.price.toFixed(2)})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={() => editProduct(product)}
                className="mt-4 rounded bg-action px-4 py-2 text-white"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
