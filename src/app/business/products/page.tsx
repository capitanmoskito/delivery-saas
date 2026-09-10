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
  price: number;
  category?: Category;
};

export default function ProductsPage() {

  const [products, setProducts] =
    useState<Product[]>([]);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [file, setFile] =
    useState<File | null>(null);

  const [form, setForm] =
    useState({

      name: "",

      categoryId: "",

      price: "",
    });

  async function loadData() {

    const [productsRes, categoriesRes] =
      await Promise.all([

        fetch("/api/products"),

        fetch("/api/categories"),
      ]);

    const productsData =
      await productsRes.json();

    const categoriesData =
      await categoriesRes.json();

    setProducts(
      productsData
    );

    setCategories(
      categoriesData
    );

    console.log(
      "Productos:",
      productsData
    );
  }

  async function createProduct() {

    await fetch(
      "/api/products",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({

          tenantId:
            "TEMP",

          categoryId:
            form.categoryId,

          name:
            form.name,

          price:
            Number(
              form.price
            ),
        }),
      }
    );

    setForm({

      name: "",

      categoryId: "",

      price: "",
    });

    loadData();
  }

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };

    void fetchData();
  }, []);

  return (

    <div>

      <h1 className="mb-6 text-3xl font-bold">

        Productos

      </h1>

      <div className="mb-6 space-y-3 rounded border p-4">

        <div className="space-y-3">

          <input
            placeholder="Nombre producto"
            className="w-full border p-2"
            value={form.name}
            onChange={(e)=>
              setForm({

                ...form,

                name:
                  e.target.value,
              })
            }
          />

          <select
            className="w-full border p-2"
            value={
              form.categoryId
            }
            onChange={(e)=>
              setForm({

                ...form,

                categoryId:
                  e.target.value,
              })
            }
          >

            <option value="">
              Selecciona categoría
            </option>

            {categories.map(
              (category) => (

                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>

              )
            )}

          </select>

          <input
            type="number"
            placeholder="Precio"
            className="w-full border p-2"
            value={form.price}
            onChange={(e)=>
              setForm({

                ...form,

                price:
                  e.target.value,
              })
            }
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
              alt="Vista previa del producto"
              width={160}
              height={160}
              unoptimized
              className="mt-4 h-40 rounded object-cover"
            />
          )}

          <button
            onClick={
              createProduct
            }
            className="rounded bg-black px-4 py-2 text-white"
          >
            Crear Producto
          </button>

        </div>

      </div>

      <div className="grid gap-4 md:grid-cols-3">

        {products.map(
          (product) => (

            <div
              key={product.id}
              className="rounded border p-4"
            >

              <h2 className="font-bold">

                {product.name}

              </h2>

              <p>

                Categoría:

                {" "}

                {
                  product.category
                    ?.name
                }

              </p>

              <p>

                Precio:

                ${product.price}

              </p>

            </div>

          )
        )}

      </div>

    </div>
  );
}