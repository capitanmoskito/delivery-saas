import { prisma }
from "@/src/lib/prisma";
import Link from "next/link";

export default async function HomePage() {

  const restaurants =
    await prisma.restaurant.findMany({
      take: 8
    });

  return (

    <main className="container mx-auto p-6">

      <h1 className="mb-8 text-4xl font-bold">

        Negocios Cercanos

      </h1>

      <div className="grid gap-4 md:grid-cols-4">

        {restaurants.map((restaurant) => (
          <Link key={restaurant.id} href={`/store/${restaurant.id}`}>
            <div className="rounded border p-4 hover:bg-slate-50">
              <div className="mb-2 h-32 rounded bg-slate-100" />
              <h2 className="font-bold">{restaurant.name}</h2>
              <p>⭐ 5.0</p>
              <p>20 min</p>
            </div>
          </Link>
        ))}

      </div>

    </main>
  );
}