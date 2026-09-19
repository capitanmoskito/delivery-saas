"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type CategoryItem = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCategories() {
    const response = await fetch("/api/categories");
    const data: CategoryItem[] = await response.json();
    setCategories(data);
  }

  async function saveCategory() {
    setError("");
    setSaving(true);

    try {
      let imageUrl = savedImageUrl;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("kind", "category");

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

      const response = await fetch("/api/categories", {
        method: editingCategoryId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: editingCategoryId,
          name,
          description,
          imageUrl
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo guardar la categoría");
        return;
      }

      resetForm();
      await loadCategories();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName("");
    setDescription("");
    setFile(null);
    setSavedImageUrl("");
    setEditingCategoryId(null);
  }

  function editCategory(category: CategoryItem) {
    setName(category.name);
    setDescription(category.description || "");
    setFile(null);
    setSavedImageUrl(category.imageUrl || "");
    setEditingCategoryId(category.id);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    let active = true;

    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const data: CategoryItem[] = await response.json();

        if (active) {
          setCategories(data);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    void fetchCategories();

    return () => {
      active = false;
    };
  }, []);

  return (

    <div>

      <h1 className="mb-6 text-3xl font-bold">

        Categorías

      </h1>

      <div className="mb-8 rounded border p-4">

        <h2 className="mb-4 text-xl font-semibold">

          {editingCategoryId ? "Editar categoría" : "Nueva categoría"}

        </h2>

        <div className="space-y-3">

          <input
            value={name}
            onChange={(e)=>
              setName(
                e.target.value
              )
            }
            className="w-full border p-2"
            placeholder="Nombre"
          />

          <textarea
            value={description}
            onChange={(e)=>
              setDescription(
                e.target.value
              )
            }
            className="w-full border p-2"
            placeholder="Descripción"
          />


          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={saveCategory}
            disabled={saving || !name.trim()}
            className="rounded bg-action px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {saving ? "Guardando..." : editingCategoryId ? "Guardar cambios" : "Crear categoría"}
          </button>

          {editingCategoryId && (
            <button type="button" onClick={resetForm} className="ml-2 rounded border px-4 py-2">
              Cancelar
            </button>
          )}

        </div>

      </div>

      <div className="grid gap-4 md:grid-cols-3">

        {categories.map(
          (category) => (

            <div
              key={category.id}
              className="rounded border p-4"
            >

              <h2 className="font-bold">

                {category.name}

              </h2>

              <p className="mt-2 text-sm text-gray-600">

                {
                  category.description
                }

              </p>

              <button
                type="button"
                onClick={() => editCategory(category)}
                className="mt-4 rounded border px-3 py-2 text-sm"
              >
                Editar categoría
              </button>

            </div>

          )
        )}

      </div>

    </div>
  );
}