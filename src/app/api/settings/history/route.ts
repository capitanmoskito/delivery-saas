import { prisma }
from "@/src/lib/prisma";

import { getCurrentUser }
from "@/src/lib/current-user";

import {
  NextResponse
}
from "next/server";

export async function GET() {

  const user =
    await getCurrentUser();

  if (!user?.id || !user.tenantId) {
    return NextResponse.json(
      {
        success: false,
        message: "Sesión no válida"
      },
      { status: 401 }
    );
  }

  const rows =
    await prisma.businessConfigurationAudit.findMany({

      where: {
        tenantId: user.tenantId
      },

      orderBy: {
        createdAt:
          "desc"
      },

      take: 50
    });

  const userIds = [
    ...new Set(
      rows.map((row) => row.userId)
    )
  ];

  const users =
    await prisma.user.findMany({

      where: {
        id: {
          in: userIds
        }
      },

      select: {
        id: true,
        email: true
      }
    });

  const emailsByUserId =
    new Map(
      users.map((item) => [
        item.id,
        item.email
      ])
    );

  return NextResponse.json({
    success: true,
    rows: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      field: row.fieldName,
      previousValue: row.previousValue,
      newValue: row.newValue,
      user:
        emailsByUserId.get(row.userId) ||
        "Administrador"
    }))
  });
}