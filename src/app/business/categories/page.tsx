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

  async function loadCategories() {
    const response = await fetch("/api/categories");
    const data: CategoryItem[] = await response.json();
    setCategories(data);
  }

  async function createCategory() {

    let imageUrl = "";

    if (file) {

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const uploadResponse =
        await fetch(
          "/api/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      const uploadData =
        await uploadResponse.json();

      imageUrl =
        uploadData.url;
    }

    await fetch(
      "/api/categories",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({

          tenantId:
            "TEMP",

          name,

          description,

          imageUrl,
        }),
      }
    );

    setName("");

    setDescription("");

    setFile(null);

    loadCategories();
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

          Nueva Categoría

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

          <div
  onDragOver={(e) =>
    e.preventDefault()
  }
  onDrop={(e) => {

    e.preventDefault();

    const droppedFile =
      e.dataTransfer.files[0];

    if (droppedFile) {
      setFile(
        droppedFile
      );
    }
  }}
  className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-slate-50"
>

  <p className="font-medium">

    Arrastra aquí tu imagen

  </p>

  <p className="text-sm text-gray-500">

    o selecciona una desde tu equipo

  </p>

  <input
    type="file"
    accept="image/*"
    className="mt-4"
    onChange={(e)=>
      setFile(
        e.target.files?.[0]
        ?? null
      )
    }
  />

</div>

<p className="text-xs text-gray-500">

Máximo 5 MB

PNG, JPG o WEBP

</p>

          {file && (
            <Image
              src={URL.createObjectURL(file)}
              alt="Vista previa de la categoría"
              width={160}
              height={160}
              unoptimized
              className="mt-4 h-40 rounded object-cover"
            />
          )}

          <button
            onClick={
              createCategory
            }
            className="rounded bg-black px-4 py-2 text-white"
          >
            Crear Categoría
          </button>

        </div>

      </div>

      <div className="grid gap-4 md:grid-cols-3">

        {categories.map(
          (category) => (

            <div
              key={category.id}
              className="rounded border p-4"
            >

              {category.imageUrl && (
                <div className="relative mb-3 h-40 w-full overflow-hidden rounded">
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              )}

              <h2 className="font-bold">

                {category.name}

              </h2>

              <p className="mt-2 text-sm text-gray-600">

                {
                  category.description
                }

              </p>

            </div>

          )
        )}

      </div>

    </div>
  );
}