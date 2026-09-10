import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {

  const products =
    await prisma.product.findMany({

      include: {
        category: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return NextResponse.json(
    products
  );
}

export async function POST(
  request: Request
) {

  try {

    const body =
      await request.json();

    const product =
      await prisma.product.create({

        data: {

          tenantId:
            body.tenantId,

          categoryId:
            body.categoryId,

          name:
            body.name,

          description:
            body.description ?? "",

          imageUrl:
            body.imageUrl ?? "",

          price:
            Number(
              body.price
            ),

          prepMinutes: 15,
        },
      });

    return NextResponse.json(
      product
    );

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}