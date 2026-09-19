import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { validatePassword } from "@/src/lib/password-validator";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const firstName = String(data.firstName ?? "").trim();
    const lastName = String(data.lastName ?? "").trim();
    const email = String(data.email ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    const passwordRules = validatePassword(password);

    if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Completa nombre, apellido y correo válido" }, { status: 400 });
    }

    if (!Object.values(passwordRules).every(Boolean)) {
      return NextResponse.json({ error: "La contraseña no cumple los requisitos de seguridad" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    if (existingUser) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        firstName,
        lastNamePaternal: lastName,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "customer"
      }
    });

    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } }, { status: 201 });
    response.cookies.set("saas_user", JSON.stringify({ id: user.id, email: user.email, role: user.role, tenantId: null }), { httpOnly: true, path: "/" });
    return response;
  } catch (error) {
    console.error("Customer registration error:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
  }
}