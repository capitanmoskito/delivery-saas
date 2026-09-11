import { prisma }
from "@/src/lib/prisma";

import { getCurrentUser }
from "@/src/lib/current-user";

import {
  generateOtp
}
from "@/src/modules/settings/settings-otp.service";

import {
  sendSettingsOtp
}
from "@/src/modules/settings/settings-mail.service";

import {
  NextResponse
}
from "next/server";

export async function POST() {

  const user =
    await getCurrentUser();

  if (!user?.id || !user.tenantId || !user.email) {

    return NextResponse.json(
      {
        success: false,
        message: "Sesión no válida"
      },
      {
        status: 401
      }
    );
  }

  const code =
    generateOtp();

  const expiresAt =
    new Date();

  expiresAt.setMinutes(
    expiresAt.getMinutes() + 5
  );

  try {

    await prisma.settingsOtp.create({

      data: {

        tenantId:
          user.tenantId,

        userId:
          user.id,

        code,

        expiresAt,
      }
    });

    await sendSettingsOtp(
      user.email,
      code
    );

  } catch (error) {

    console.error(
      "Error enviando OTP:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo enviar el código"
      },
      {
        status: 500
      }
    );
  }

  return NextResponse.json({

  success: true,

  debugCode:
    process.env.SHOW_DEBUG_OTP ===
    "true"
      ? code
      : null
});
}