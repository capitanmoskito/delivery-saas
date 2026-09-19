"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
};

type PackageItem = {
  quantity: number;
  product: Product;
};

type PackageComplement = {
  id: string;
  name: string;
  price: number;
};

type Package = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  items: PackageItem[];
  complements: PackageComplement[];
};

type ComplementDraft = {
  id: string;
  name: string;
  price: string;
};

const emptyForm = {
  name: "",
  description: "",
  price: ""
};

export default function PackagesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [complements, setComplements] = useState<ComplementDraft[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState("");
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    const [productsResponse, packagesResponse] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/packages")
    ]);

    const productsData: unknown = await productsResponse.json();
    const packagesData: unknown = await packagesResponse.json();

    if (!productsResponse.ok || !Array.isArray(productsData)) {
      setError("No se pudieron cargar los productos");
      return;
    }

    if (!packagesResponse.ok || !Array.isArray(packagesData)) {
      setError("No se pudieron cargar los paquetes");
      return;
    }

    setProducts(productsData as Product[]);
    setPackages(packagesData as Package[]);
  }

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [productsResponse, packagesResponse] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/packages")
        ]);
        const productsData: unknown = await productsResponse.json();
        const packagesData: unknown = await packagesResponse.json();

        if (!active) {
          return;
        }

        if (!productsResponse.ok || !Array.isArray(productsData)) {
          setError("No se pudieron cargar los productos");
          return;
        }

        if (!packagesResponse.ok || !Array.isArray(packagesData)) {
          setError("No se pudieron cargar los paquetes");
          return;
        }

        setProducts(productsData as Product[]);
        setPackages(packagesData as Package[]);
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

  function setProductQuantity(productId: string, quantity: number) {
    setSelectedProducts((current) => {
      const next = { ...current };

      if (quantity < 1) {
        delete next[productId];
      } else {
        next[productId] = quantity;
      }

      return next;
    });
  }

  function addComplement() {
    setComplements((current) => [
      ...current,
      { id: crypto.randomUUID(), name: "", price: "0" }
    ]);
  }

  function updateComplement(id: string, field: "name" | "price", value: string) {
    setComplements((current) => current.map((complement) =>
      complement.id === id ? { ...complement, [field]: value } : complement
    ));
  }

  function resetForm() {
    setForm(emptyForm);
    setSelectedProducts({});
    setComplements([]);
    setFile(null);
    setSavedImageUrl("");
    setEditingPackageId(null);
    setShowForm(false);
    setError("");
  }

  function editPackage(item: Package) {
    setForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price)
    });
    setSelectedProducts(Object.fromEntries(
      item.items.map((packageItem) => [packageItem.product.id, packageItem.quantity])
    ));
    setComplements(item.complements.map((complement) => ({
      id: complement.id,
      name: complement.name,
      price: String(complement.price)
    })));
    setFile(null);
    setSavedImageUrl(item.imageUrl || "");
    setEditingPackageId(item.id);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePackage() {
    setError("");
    setSaving(true);

    try {
      let imageUrl = savedImageUrl;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("kind", "package");

        const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData: { success?: boolean; url?: string; message?: string } = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadData.success || !uploadData.url) {
          setError(uploadData.message || "No se pudo subir la imagen");
          return;
        }

        imageUrl = uploadData.url;
      }

      const response = await fetch("/api/packages", {
        method: editingPackageId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPackageId,
          ...form,
          price: Number(form.price),
          imageUrl,
          items: Object.entries(selectedProducts).map(([productId, quantity]) => ({ productId, quantity })),
          complements: complements.map(({ name, price }) => ({ name, price: Number(price) }))
        })
      });
      const data: { error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo crear el paquete");
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

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Paquetes</h1>
      <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded bg-action px-4 py-2 text-white"
      >
        Nuevo Paquete
      </button>
      </div>

      {showForm && (
        <section className="mt-6 space-y-5 rounded border p-4">
          <h2 className="text-xl font-semibold">
            {editingPackageId ? "Editar paquete" : "Nuevo paquete"}
          </h2>

          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="w-full border p-2"
            placeholder="Nombre del paquete"
          />

          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            className="min-h-28 w-full border p-2"
            placeholder="Descripción del paquete"
          />

          <input
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            className="w-full border p-2"
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio especial"
          />

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
            {file || savedImageUrl ? (
              <Image
                src={file ? URL.createObjectURL(file) : savedImageUrl}
                alt="Vista previa del paquete"
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <>
                <p className="font-medium">Arrastra aquí la imagen del paquete</p>
                <p className="text-sm text-gray-500">o selecciona una desde tu equipo</p>
              </>
            )}
          </label>

          <p className="text-xs text-gray-500">Máximo 5 MB. PNG, JPG o WEBP.</p>

          <div>
            <h3 className="font-semibold">Productos del paquete</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {products.map((product) => {
                const quantity = selectedProducts[product.id] || 0;

                return (
                  <div key={product.id} className="flex items-center gap-3 rounded border p-3">
                    <input
                      type="checkbox"
                      checked={quantity > 0}
                      onChange={(event) => setProductQuantity(product.id, event.target.checked ? 1 : 0)}
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
                        onChange={(event) => setProductQuantity(product.id, Number(event.target.value))}
                        className="w-16 border p-2"
                        aria-label={`Cantidad de ${product.name}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Complementos</h3>
              <button type="button" onClick={addComplement} className="rounded border px-3 py-2 text-sm">
                Agregar complemento
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {complements.map((complement) => (
                <div key={complement.id} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={complement.name}
                    onChange={(event) => updateComplement(complement.id, "name", event.target.value)}
                    className="flex-1 border p-2"
                    placeholder="Nombre del complemento"
                  />
                  <input
                    value={complement.price}
                    onChange={(event) => updateComplement(complement.id, "price", event.target.value)}
                    className="w-full border p-2 sm:w-36"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Precio extra"
                  />
                  <button
                    type="button"
                    onClick={() => setComplements((current) => current.filter((item) => item.id !== complement.id))}
                    className="rounded border border-red-200 px-3 py-2 text-red-600"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="button"
              onClick={savePackage}
              disabled={saving || !form.name.trim() || !form.price || Object.keys(selectedProducts).length === 0}
              className="rounded bg-action px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? "Guardando..." : editingPackageId ? "Guardar cambios" : "Crear paquete"}
            </button>
            <button type="button" onClick={resetForm} className="ml-2 rounded border px-4 py-2">Cancelar</button>
          </div>
        </section>
      )}

      {error && !showForm && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {packages.map((item) => (
          <article key={item.id} className="overflow-hidden rounded border bg-white">
            {item.imageUrl ? (
              <div className="relative aspect-4/3">
                <Image src={item.imageUrl} alt={item.name} fill unoptimized className="object-cover" />
              </div>
            ) : (
              <div className="flex aspect-4/3 items-center justify-center bg-slate-100 text-sm text-slate-500">
                Sin imagen
              </div>
            )}
            <div className="p-4">
              <h2 className="font-bold">{item.name}</h2>
              {item.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{item.description}</p>}
              <p>Precio: ${item.price.toFixed(2)}</p>
              <p className="text-sm text-slate-600">
                {item.items.map(({ product, quantity }) => `${quantity}x ${product.name}`).join(", ")}
              </p>
              {item.complements.length > 0 && (
                <div className="mt-3 text-sm">
                  <p className="font-semibold">Complementos:</p>
                  <ul className="list-disc pl-5 text-slate-600">
                    {item.complements.map((complement) => (
                      <li key={complement.id}>
                        {complement.name}{complement.price > 0 ? ` (+$${complement.price.toFixed(2)})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={() => editPackage(item)}
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