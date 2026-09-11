import { prisma }
from "@/src/lib/prisma";

import { getCurrentUser }
from "@/src/lib/current-user";

import {
  NextResponse
}
from "next/server";

export async function POST(
  request: Request
) {

  const body =
    await request.json();

  const user =
    await getCurrentUser();

  if (!user?.id || !user.tenantId) {

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

  const otp =
    await prisma.settingsOtp.findFirst({

      where: {

        tenantId:
          user.tenantId,

        userId:
          user.id,

        code:
          body.code,

        status:
          "PENDING"
      }
    });

  if (!otp) {

    return NextResponse.json({

      success: false
    });
  }

  if (
    otp.expiresAt <
    new Date()
  ) {

    return NextResponse.json({

      success: false,

      expired: true
    });
  }

  await prisma.settingsOtp.update({

    where: {
      id: otp.id
    },

    data: {

      status:
        "VERIFIED",

      verifiedAt:
        new Date()
    }
  });

  const editExpires =
    new Date();

  editExpires.setMinutes(
    editExpires.getMinutes() + 15
  );

  await prisma.settingsEditSession.create({

    data: {

      tenantId:
        user.tenantId,

      userId:
        user.id,

      expiresAt:
        editExpires
    }
  });

  return NextResponse.json({
    success: true
  });
}