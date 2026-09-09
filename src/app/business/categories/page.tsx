"use client";

import { useEffect, useState } from "react";

type CategoryItem = {
  id: string;
  name: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function loadCategories() {
    try {
      const response = await fetch("/api/categories");

      if (!response.ok) {
        throw new Error("No se pudo cargar la lista de categorías");
      }

      const data: CategoryItem[] = await response.json();
      setCategories(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar las categorías. Revisa la conexión a la base de datos.");
    }
  }

  async function createCategory() {
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: "TEMP",
          name,
          description: "",
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo crear la categoría");
      }

      setName("");
      await loadCategories();
    } catch (err) {
      console.error(err);
      setError("No se pudo crear la categoría.");
    }
  }

  useEffect(() => {
    let active = true;

    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");

        if (!response.ok) {
          throw new Error("No se pudo cargar la lista de categorías");
        }

        const data: CategoryItem[] = await response.json();

        if (active) {
          setCategories(data);
          setError("");
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError("No se pudieron cargar las categorías. Revisa la conexión a la base de datos.");
        }
      }
    };

    void fetchCategories();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Categorías</h1>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      <div className="mb-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2"
          placeholder="Nueva categoría"
        />

        <button onClick={createCategory} className="bg-black px-4 py-2 text-white">
          Crear
        </button>
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="rounded border p-3">
            {category.name}
          </div>
        ))}
      </div>
    </div>
  );
}