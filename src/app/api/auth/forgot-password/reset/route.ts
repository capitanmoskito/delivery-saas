import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { hashPasswordResetToken } from "@/src/modules/auth/password-reset-token.service";
import { validatePassword } from "@/src/lib/password-validator";

export async function POST(request: Request) {
  const token = (await cookies()).get("password_reset_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "La sesión de recuperación expiró" },
      { status: 401 }
    );
  }

  const session = await prisma.passwordResetSession.findUnique({
    where: {
      tokenHash: hashPasswordResetToken(token)
    }
  });

  if (!session || session.usedAt || session.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, message: "La sesión de recuperación expiró" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  const rules = validatePassword(password);

  if (!password) {
    return NextResponse.json(
      { success: false, message: "Debes de agregar una nueva contraseña" },
      { status: 400 }
    );
  }

  if (!Object.values(rules).every(Boolean) || password !== confirmPassword) {
    return NextResponse.json(
      { success: false, message: "La contraseña no cumple las validaciones" },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: session.userId
      },
      data: {
        passwordHash: await bcrypt.hash(password, 12)
      }
    }),
    prisma.passwordResetSession.update({
      where: {
        id: session.id
      },
      data: {
        usedAt: new Date()
      }
    }),
    prisma.businessConfigurationAudit.create({
      data: {
        tenantId: session.tenantId,
        userId: session.userId,
        fieldName: "Contraseña",
        previousValue: "[REDACTED]",
        newValue: "[REDACTED]"
      }
    })
  ]);

  const response = NextResponse.json({
    success: true
  });
  response.cookies.delete("password_reset_token");

  return response;
}