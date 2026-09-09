"use client";

import { useEffect, useState } from "react";

export default function CategoriesPage() {

  const [categories, setCategories] =
    useState<any[]>([]);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  async function loadCategories() {

    const response =
      await fetch(
        "/api/categories"
      );

    const data =
      await response.json();

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

    loadCategories();

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

          <input
            type="file"
            accept="image/*"
            onChange={(e)=>
              setFile(
                e.target.files?.[0] ??
                  null
              )
            }
          />

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

                <img
                  src={
                    category.imageUrl
                  }
                  alt={
                    category.name
                  }
                  className="mb-3 h-40 w-full rounded object-cover"
                />

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