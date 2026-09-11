import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";
import { validatePassword } from "@/src/lib/password-validator";

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

  const editSession = await prisma.settingsEditSession.findFirst({
    where: {
      tenantId: user.tenantId,
      userId: user.id,
      active: true,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!editSession) {
    return NextResponse.json(
      {
        success: false,
        message: "Debes validar el código antes de cambiar la contraseña"
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  const rules = validatePassword(newPassword);
  const valid = Object.values(rules).every(Boolean);

  if (!newPassword) {
    return NextResponse.json(
      {
        success: false,
        message: "Debes de agregar una nueva contraseña"
      },
      { status: 400 }
    );
  }

  if (!valid || newPassword !== confirmPassword) {
    return NextResponse.json(
      {
        success: false,
        message: "La contraseña no cumple las validaciones"
      },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: {
        id: user.id
      },
      data: {
        passwordHash
      }
    });

    await transaction.businessConfigurationAudit.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        fieldName: "Contraseña",
        previousValue: "[REDACTED]",
        newValue: "[REDACTED]"
      }
    });

    await transaction.settingsEditSession.update({
      where: {
        id: editSession.id
      },
      data: {
        active: false
      }
    });
  });

  return NextResponse.json({
    success: true
  });
}
