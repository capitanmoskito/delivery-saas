import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: {
        tenantId: user.tenantId
      },
      include: {
        category: true,
        variants: {
          where: { active: true },
          orderBy: { createdAt: "asc" }
        }
      },

      orderBy: {
        createdAt: "desc",
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los productos" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {

  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const body =
      await request.json();

    const variants = normalizeVariants(body.variants);

    const product =
      await prisma.product.create({

        data: {

          tenantId:
            user.tenantId,

          categoryId:
            body.categoryId,

          name:
            body.name,

          description:
            String(body.description ?? "").trim(),

          imageUrl:
            body.imageUrl ?? "",

          price:
            Number(
              body.price
            ),

          prepMinutes: 15,
          variants: {
            create: variants.map((variant) => ({
              tenantId: user.tenantId,
              name: variant.name,
              price: variant.price
            }))
          }
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

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const body = await request.json();
    const productId = String(body.id ?? "");

    if (!productId) {
      return NextResponse.json({ error: "Producto no válido" }, { status: 400 });
    }

    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
      select: { id: true }
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const variants = normalizeVariants(body.variants);

    await prisma.$transaction(async (transaction) => {
      await transaction.product.update({
        where: { id: productId },
        data: {
          categoryId: String(body.categoryId ?? ""),
          name: String(body.name ?? "").trim(),
          description: String(body.description ?? "").trim(),
          price: Number(body.price),
          imageUrl: String(body.imageUrl ?? "")
        }
      });

      await transaction.productVariant.deleteMany({
        where: { productId, tenantId: user.tenantId }
      });

      if (variants.length > 0) {
        await transaction.productVariant.createMany({
          data: variants.map((variant) => ({
            productId,
            tenantId: user.tenantId,
            name: variant.name,
            price: variant.price
          }))
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el producto" },
      { status: 500 }
    );
  }
}

type NormalizedVariant = {
  name: string;
  price: number;
};

function normalizeVariants(value: unknown): NormalizedVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((variant): NormalizedVariant | null => {
      if (!variant || typeof variant !== "object") {
        return null;
      }

      const candidate = variant as { name?: unknown; price?: unknown };
      const name = String(candidate.name ?? "").trim();
      const price = Number(candidate.price ?? 0);

      if (!name || !Number.isFinite(price) || price < 0) {
        return null;
      }

      return { name, price };
    })
    .filter((variant): variant is NormalizedVariant => variant !== null);
}