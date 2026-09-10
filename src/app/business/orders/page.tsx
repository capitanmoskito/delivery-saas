import { prisma } from "@/src/lib/prisma";

export default async function OrdersPage() {

  const orders =
    await prisma.order.findMany({

      include: {
        customer: true
      },

      orderBy: {
        createdAt: "desc"
      }
    });

  return (

    <div>

      <h1 className="mb-6 text-3xl font-bold">

        Pedidos

      </h1>

      {orders.map(order => (

        <div
          key={order.id}
          className="mb-3 rounded border p-3"
        >

          <p>

            Cliente:

            {order.customer.firstName}

          </p>

          <p>

            Estado:

            {order.status}

          </p>

          <p>

            Total:

            ${order.total}

          </p>

        </div>

      ))}

    </div>

  );
}