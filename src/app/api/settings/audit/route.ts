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

  return NextResponse.json(
    rows
  );
}