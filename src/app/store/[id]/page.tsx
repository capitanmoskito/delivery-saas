import { prisma }
from "@/src/lib/prisma";

export default async function StorePage({
  params
}: {
  params: {
    id: string;
  };
}) {

  const restaurant =
    await prisma.restaurant.findUnique({

      where: {
        id: params.id
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