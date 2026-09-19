import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.tenantId) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: {
        tenantId: user.tenantId
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las categorías" },
      { status: 500 }
    );
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

    if (!name) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        tenantId: user.tenantId,
        name,
        description: String(body.description ?? "").trim(),
        imageUrl: String(body.imageUrl ?? "")
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "No se pudo crear la categoría" },
      { status: 500 }
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
    const categoryId = String(body.id ?? "");
    const name = String(body.name ?? "").trim();

    if (!categoryId || !name) {
      return NextResponse.json({ error: "Categoría no válida" }, { status: 400 });
    }

    const category = await prisma.category.updateMany({
      where: {
        id: categoryId,
        tenantId: user.tenantId
      },
      data: {
        name,
        description: String(body.description ?? "").trim(),
        imageUrl: String(body.imageUrl ?? "")
      }
    });

    if (!category.count) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la categoría" },
      { status: 500 }
    );
  }
}