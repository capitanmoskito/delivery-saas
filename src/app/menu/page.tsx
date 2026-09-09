import { prisma }
from "@/src/lib/prisma";

export default async function MenuPage() {

  const categories =
    await prisma.category.findMany({

      include: {
        products: true
      }
    });

  return (

    <div className="container mx-auto p-6">

      <h1 className="mb-8 text-4xl font-bold">

        Menú

      </h1>

      {categories.map(
        (category) => (

          <div
            key={category.id}
            className="mb-8"
          >

            <h2 className="mb-4 text-2xl font-bold">

              {category.name}

            </h2>

            <div className="grid gap-4 md:grid-cols-2">

              {category.products.map(
                (product) => (

                  <div
                    key={product.id}
                    className="rounded border p-4"
                  >

                    <h3 className="font-semibold">

                      {product.name}

                    </h3>

                    <p>

                      ${product.price}

                    </p>

                  </div>

                )
              )}

            </div>

          </div>

        )
      )}

    </div>
  );
}