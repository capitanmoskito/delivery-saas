import { prisma }
from "@/src/lib/prisma";

export default async function StorePage({
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {

  const { id } = await params;

  const restaurant =
    await prisma.restaurant.findUnique({

      where: {
        id
      }
    });

  if (!restaurant) {

    return (
      <div>
        Negocio no encontrado
      </div>
    );
  }

  return (

    <div className="container mx-auto p-6">

      <h1 className="text-4xl font-bold">

        {restaurant.name}

      </h1>

    </div>
  );
}