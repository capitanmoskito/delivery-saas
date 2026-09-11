import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { sendSettingsOtp } from "@/src/modules/settings/settings-mail.service";
import { generateOtp } from "@/src/modules/settings/settings-otp.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!user || !user.tenantId) {
      return NextResponse.json({
        success: true,
        message: "Si el correo existe, recibirás un código"
      });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.settingsOtp.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        code,
        expiresAt
      }
    });

    await sendSettingsOtp(email, code);

    return NextResponse.json({
      success: true,
      message: "Si el correo existe, recibirás un código",
      debugCode:
        process.env.SHOW_DEBUG_OTP === "true"
          ? code
          : null
    });
  } catch (error) {
    console.error("FORGOT PASSWORD SEND OTP ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo enviar el código"
      },
      { status: 500 }
    );
  }
}