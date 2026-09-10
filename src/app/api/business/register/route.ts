import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

import { prisma } from "@/src//lib/prisma";

function generatePrefix(
  businessName: string
) {

  return businessName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase();
}

async function generateReferralCode(
  businessName: string,
  sequence: number
) {

  const random =
    Math.floor(
      100 +
      Math.random() * 900
    );

  const prefix =
    businessName
      .replace(
        /[^A-Za-z]/g,
        ""
      )
      .toUpperCase()
      .substring(0, 3);

  const year =
    new Date()
      .getFullYear()
      .toString()
      .slice(-2);

  return `${random}-${prefix}-${year}${sequence}`;
}

export async function POST(
  request: Request
) {

  try {

    const body =
      await request.json();

    const existingUser =
      await prisma.user.findUnique({

        where: {
          email: body.email
        }
      });

    if (existingUser) {

      return NextResponse.json(
        {
          success: false,
          message:
            "El correo ya existe"
        },
        {
          status: 400
        }
      );
    }

    const prefix =
      generatePrefix(
        body.businessName
      );

const sequence =
  await prisma.tenant.count() + 1;

    const referralCode =
  await generateReferralCode(
    body.businessName,
    sequence
  );

    const passwordHash =
      await bcrypt.hash(
        body.password,
        12
      );

    const settings =
      await prisma.saaSSettings.findFirst();

    const trialDays =
      settings?.trialDays ?? 15;

    const trialEndsAt =
      new Date();

    trialEndsAt.setDate(
      trialEndsAt.getDate()
      + trialDays
    );

    const tenant =
      await prisma.tenant.create({

        data: {

          businessName:
            body.businessName,

          prefix,

          referralCode,

          status: "trial",

          trialEndsAt
        }
      });

    const user =
  await prisma.user.create({

    data: {

      firstName:
        body.firstName,

      lastNamePaternal:
        body.lastNamePaternal,

      lastNameMaternal:
        body.lastNameMaternal,

      email:
        body.email,

      passwordHash,

      role:
        "restaurant_admin",

      tenantId:
        tenant.id
    }
  });

    const restaurant =
      await prisma.restaurant.create({

        data: {

          tenantId:
            tenant.id,

          name:
            body.businessName
        }
      });

    await prisma.referralCode.create({

      data: {

        tenantId:
          tenant.id,

        code:
          referralCode
      }
    });

    return NextResponse.json({

      success: true,

      tenant,

      user,

      restaurant
    });

  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Error al registrar negocio"
      },
      {
        status: 500
      }
    );
  }
}