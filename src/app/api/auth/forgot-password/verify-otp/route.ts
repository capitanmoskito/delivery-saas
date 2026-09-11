import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { createPasswordResetToken } from "@/src/modules/auth/password-reset-token.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const code = String(body.code ?? "").replace(/\D/g, "");
    const user = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!user || !user.tenantId) {
      return NextResponse.json(
        { success: false, message: "El código no es válido" },
        { status: 400 }
      );
    }

  const otp = await prisma.settingsOtp.findFirst({
    where: {
      userId: user.id,
      tenantId: user.tenantId,
      code,
      status: "PENDING",
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

    if (!otp) {
      return NextResponse.json(
        { success: false, message: "El código no es válido o expiró" },
        { status: 400 }
      );
    }

  const { token, tokenHash } = createPasswordResetToken();

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
    prisma.passwordResetSession.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    })
  ]);

  const response = NextResponse.json({
    success: true
  });

  response.cookies.set("password_reset_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/"
  });

    return response;
  } catch (error) {
    console.error("FORGOT PASSWORD VERIFY OTP ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo validar el código"
      },
      { status: 500 }
    );
  }
}