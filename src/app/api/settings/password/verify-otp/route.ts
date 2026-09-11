import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.id || !user.tenantId) {
    return NextResponse.json(
      {
        success: false,
        message: "Sesión no válida"
      },
      { status: 401 }
    );
  }

  const body = await request.json();
  const code = String(body.code ?? "").trim();
  const otp = await prisma.settingsOtp.findFirst({
    where: {
      tenantId: user.tenantId,
      userId: user.id,
      code,
      status: "PENDING"
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!otp) {
    return NextResponse.json(
      {
        success: false,
        message: "El código no es válido"
      },
      { status: 400 }
    );
  }

  if (otp.expiresAt < new Date()) {
    return NextResponse.json(
      {
        success: false,
        message: "El código expiró"
      },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.settingsOtp.update({
      where: {
        id: otp.id
      },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date()
      }
    }),
    prisma.settingsEditSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    })
  ]);

  return NextResponse.json({
    success: true
  });
}
