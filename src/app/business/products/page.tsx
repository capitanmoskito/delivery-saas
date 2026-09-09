"use client";

import { useEffect, useState } from "react";

type CategoryItem = {
  id: string;
  name: string;
};

type ProductItem = {
  id: string;
  name: string;
  price: number;
  category?: {
    name?: string;
  };
};

export default function ProductsPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    price: "",
  });

  async function loadData() {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories"),
    ]);

    const productsData: ProductItem[] = await productsRes.json();
    const categoriesData: CategoryItem[] = await categoriesRes.json();

    setProducts(productsData);
    setCategories(categoriesData);
  }

  async function createProduct() {
    await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setForm({
      name: "",
      categoryId: "",
      price: "",
    });

    await loadData();
  }

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);

      const productsData: ProductItem[] = await productsRes.json();
      const categoriesData: CategoryItem[] = await categoriesRes.json();

      if (active) {
        setProducts(productsData);
        setCategories(categoriesData);
      }
    };

    void fetchData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Productos</h1>

      <div className="mb-8 space-y-3">
        <input
          placeholder="Producto"
          className="w-full border p-2"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
        />

        <select
          className="w-full border p-2"
          value={form.categoryId}
          onChange={(e) =>
            setForm({
              ...form,
              categoryId: e.target.value,
            })
          }
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
          placeholder="Precio"
          className="w-full border p-2"
          value={form.price}
          onChange={(e) =>
            setForm({
              ...form,
              price: e.target.value,
            })
          }
        />

        <button onClick={createProduct} className="rounded bg-black px-4 py-2 text-white">
          Crear
        </button>
      </div>

      <div className="space-y-3">
        {products.map((product) => (
          <div key={product.id} className="rounded border p-4">
            <h2 className="font-bold">{product.name}</h2>
            <p>{product.category?.name}</p>
            <p>${product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}