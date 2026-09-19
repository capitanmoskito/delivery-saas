import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

type PackageItemInput = {
  productId?: unknown;
  quantity?: unknown;
};

type PackageComplementInput = {
  name?: unknown;
  price?: unknown;
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const packages = await prisma.package.findMany({
      where: { tenantId: user.tenantId },
      include: {
        items: {
          include: { product: true }
        },
        complements: {
          where: { active: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json({ error: "No se pudieron cargar los paquetes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const price = Number(body.price);
    const items = normalizeItems(body.items);
    const complements = normalizeComplements(body.complements);

    if (!name || !Number.isFinite(price) || price < 0 || items.length === 0) {
      return NextResponse.json({ error: "Completa el nombre, precio y al menos un producto" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        active: true,
        id: { in: items.map((item) => item.productId) }
      },
      select: { id: true }
    });

    if (products.length !== items.length) {
      return NextResponse.json({ error: "Uno o más productos no están disponibles" }, { status: 400 });
    }

    const createdPackage = await prisma.package.create({
      data: {
        tenantId: user.tenantId,
        name,
        description: String(body.description ?? "").trim(),
        imageUrl: String(body.imageUrl ?? ""),
        price,
        items: {
          create: items
        },
        complements: {
          create: complements
        }
      },
      include: {
        items: { include: { product: true } },
        complements: true
      }
    });

    return NextResponse.json(createdPackage, { status: 201 });
  } catch (error) {
    console.error("Error creating package:", error);
    return NextResponse.json({ error: "No se pudo crear el paquete" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const body = await request.json();
    const packageId = String(body.id ?? "");
    const name = String(body.name ?? "").trim();
    const price = Number(body.price);
    const items = normalizeItems(body.items);
    const complements = normalizeComplements(body.complements);

    if (!packageId || !name || !Number.isFinite(price) || price < 0 || items.length === 0) {
      return NextResponse.json({ error: "Completa el nombre, precio y al menos un producto" }, { status: 400 });
    }

    const existingPackage = await prisma.package.findFirst({
      where: { id: packageId, tenantId: user.tenantId },
      select: { id: true }
    });

    if (!existingPackage) {
      return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        active: true,
        id: { in: items.map((item) => item.productId) }
      },
      select: { id: true }
    });

    if (products.length !== items.length) {
      return NextResponse.json({ error: "Uno o más productos no están disponibles" }, { status: 400 });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.package.update({
        where: { id: packageId },
        data: {
          name,
          description: String(body.description ?? "").trim(),
          imageUrl: String(body.imageUrl ?? ""),
          price
        }
      });

      await transaction.packageItem.deleteMany({ where: { packageId } });
      await transaction.packageComplement.deleteMany({ where: { packageId } });

      await transaction.packageItem.createMany({
        data: items.map((item) => ({ packageId, ...item }))
      });

      if (complements.length > 0) {
        await transaction.packageComplement.createMany({
          data: complements.map((complement) => ({ packageId, ...complement }))
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating package:", error);
    return NextResponse.json({ error: "No se pudo actualizar el paquete" }, { status: 500 });
  }
}

function normalizeItems(value: unknown): Array<{ productId: string; quantity: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  const items = new Map<string, number>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const item = candidate as PackageItemInput;
    const productId = String(item.productId ?? "");
    const quantity = Number(item.quantity ?? 0);

    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      continue;
    }

    items.set(productId, quantity);
  }

  return Array.from(items, ([productId, quantity]) => ({ productId, quantity }));
}

function normalizeComplements(value: unknown): Array<{ name: string; price: number }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return [];
    }

    const complement = candidate as PackageComplementInput;
    const name = String(complement.name ?? "").trim();
    const price = Number(complement.price ?? 0);

    if (!name || !Number.isFinite(price) || price < 0) {
      return [];
    }

    return [{ name, price }];
  });
}