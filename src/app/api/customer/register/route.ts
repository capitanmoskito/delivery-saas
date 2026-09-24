import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { validatePassword } from "@/src/lib/password-validator";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const firstName = String(data.firstName ?? "").trim();
    const lastNamePaternal = String(data.lastNamePaternal ?? "").trim();
    const lastNameMaternal = String(data.lastNameMaternal ?? "").trim();
    const email = String(data.email ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    const promoCode = String(data.promoCode ?? "").trim().toUpperCase();
    const passwordRules = validatePassword(password);

    if (!firstName || !lastNamePaternal || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Completa nombre, apellido y correo válido" }, { status: 400 });
    }

    if (!Object.values(passwordRules).every(Boolean)) {
      return NextResponse.json({ error: "La contraseña no cumple los requisitos de seguridad" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (existingUser) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
    }

    let promoCodeRecord = null;

    if (promoCode) {
      promoCodeRecord = await prisma.promoCode.findUnique({ where: { code: promoCode } });
      const now = new Date();
      const isExpired = promoCodeRecord?.endsAt ? promoCodeRecord.endsAt < now : false;
      const isNotStarted = promoCodeRecord?.startsAt ? promoCodeRecord.startsAt > now : false;
      const isLimitReached = promoCodeRecord?.usageLimit ? promoCodeRecord.usedCount >= promoCodeRecord.usageLimit : false;

      if (!promoCodeRecord || !promoCodeRecord.active || isExpired || isNotStarted || isLimitReached) {
        return NextResponse.json({ error: "El código promocional no es válido" }, { status: 400 });
      }
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastNamePaternal,
        lastNameMaternal: lastNameMaternal || null,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "customer"
      }
    });

    if (promoCodeRecord) {
      await prisma.promoCode.update({ where: { id: promoCodeRecord.id }, data: { usedCount: { increment: 1 } } });
    }

    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } }, { status: 201 });
    response.cookies.set("saas_user", JSON.stringify({ id: user.id, email: user.email, role: user.role, tenantId: null }), { httpOnly: true, path: "/" });
    return response;
  } catch (error) {
    console.error("Customer registration error:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
  }
}