import { prisma } from "@/src/lib/prisma";
import StoreCard from "@/src/components/store-card";
import MarketplaceHeader
from "@/src/components/marketplace-header";

export default async function HomePage() {

  const restaurants =
    await prisma.restaurant.findMany();

  return (

    <main>
      <MarketplaceHeader />

      <section
        className="
          bg-[#D95D39]
          px-10
          py-20
          text-white
        "
      >

        <h1
          className="
            max-w-3xl
            text-6xl
            font-bold
          "
        >
          Encuentra la mejor comida cerca de ti
        </h1>

      </section>

      <section
        className="
          mx-auto
          max-w-7xl
          p-8
        "
      >

        <h2
          className="
            mb-8
            text-3xl
            font-bold
          "
        >
          Negocios cercanos
        </h2>

        <div
          className="
            grid
            gap-6
            md:grid-cols-2
            lg:grid-cols-4
          "
        >

          {restaurants.map(
            (restaurant) => (

              <StoreCard
                key={restaurant.id}
                id={restaurant.id}
                name={restaurant.name}
              />

            )
          )}

        </div>

      </section>

    </main>
  );
}