import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/current-user";

const currencies = [
  "MXN",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "COP",
  "ARS",
  "CLP",
  "PEN",
  "BRL"
] as const;

type Currency = (typeof currencies)[number];

function isCurrency(value: string): value is Currency {
  return currencies.includes(value as Currency);
}

export async function GET() {
  try {
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

    const [profile, tenant, latestAudit] = await Promise.all([
      prisma.businessProfile.findUnique({
        where: {
          tenantId: user.tenantId
        }
      }),
      prisma.tenant.findUnique({
        where: {
          id: user.tenantId
        },
        select: {
          businessName: true
        }
      }),
      prisma.businessConfigurationAudit.findFirst({
        where: {
          tenantId: user.tenantId
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    ]);

    const auditUser = latestAudit
      ? await prisma.user.findUnique({
          where: {
            id: latestAudit.userId
          },
          select: {
            email: true
          }
        })
      : null;

    const modifiedSections = latestAudit
      ? latestAudit.fieldName === "business_profile"
        ? ["Configuración general"]
        : latestAudit.fieldName
            .split(",")
            .map((section) => section.trim())
            .filter(Boolean)
      : [];

    return NextResponse.json({
      success: true,
      profile: profile
        ? {
            ...profile,
            businessName:
              tenant?.businessName ||
              profile.businessName
          }
        : tenant
          ? {
              businessName: tenant.businessName
            }
          : null,
      lastModification: latestAudit
        ? {
            createdAt: latestAudit.createdAt,
            user: auditUser?.email || "Administrador",
            modifiedSections
          }
        : null
    });
  } catch (error) {
    console.error("SETTINGS PROFILE GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo consultar la configuración"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
          message: "Debes validar el código de seguridad antes de guardar"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const businessName = String(body.businessName ?? "").trim();
    const contactEmail = String(body.contactEmail ?? "").trim();
    const phoneNumber = String(body.phoneNumber ?? "").trim();
    const currencyValue = String(body.currency ?? "MXN");

    if (!businessName) {
      return NextResponse.json(
        {
          success: false,
          message: "El nombre comercial es obligatorio"
        },
        { status: 400 }
      );
    }

    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: "El correo de contacto no es válido"
        },
        { status: 400 }
      );
    }

    if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
      return NextResponse.json(
        {
          success: false,
          message: "El teléfono debe contener 10 dígitos"
        },
        { status: 400 }
      );
    }

    if (!isCurrency(currencyValue)) {
      return NextResponse.json(
        {
          success: false,
          message: "La moneda seleccionada no es válida"
        },
        { status: 400 }
      );
    }

    const previousProfile = await prisma.businessProfile.findUnique({
      where: {
        tenantId: user.tenantId
      }
    });

    const profileData = {
      businessName,
      description: String(body.description ?? "").trim() || null,
      phonePrefix: String(body.phonePrefix ?? "").trim() || null,
      phoneNumber: phoneNumber || null,
      contactEmail: contactEmail || null,
      adminEmail: user.email,
      postalCode: String(body.postalCode ?? "").trim() || null,
      latitude: body.latitude === null || body.latitude === undefined || body.latitude === ""
        ? null
        : Number(body.latitude),
      longitude: body.longitude === null || body.longitude === undefined || body.longitude === ""
        ? null
        : Number(body.longitude),
      logoUrl: String(body.logoUrl ?? "").trim() || null,
      bannerUrl: String(body.bannerUrl ?? "").trim() || null,
      galleryUrls: Array.isArray(body.galleryUrls)
        ? body.galleryUrls.map((url: unknown) => String(url))
        : [],
      country: String(body.country ?? "").trim() || null,
      state: String(body.state ?? "").trim() || null,
      city: String(body.city ?? "").trim() || null,
      neighborhood: String(body.neighborhood ?? "").trim() || null,
      addressLine: String(body.addressLine ?? "").trim() || null,
      currency: currencyValue
    };

    const modifiedSections = [
      [
        "Nombre comercial",
        previousProfile?.businessName,
        businessName
      ],
      [
        "Descripción",
        previousProfile?.description,
        profileData.description
      ],
      [
        "Correo de contacto",
        previousProfile?.contactEmail,
        profileData.contactEmail
      ],
      [
        "Teléfono",
        `${previousProfile?.phonePrefix || ""}${previousProfile?.phoneNumber || ""}`,
        `${profileData.phonePrefix || ""}${profileData.phoneNumber || ""}`
      ],
      [
        "Dirección",
        JSON.stringify([
          previousProfile?.postalCode,
          previousProfile?.country,
          previousProfile?.state,
          previousProfile?.city,
          previousProfile?.neighborhood,
          previousProfile?.addressLine
        ]),
        JSON.stringify([
          profileData.postalCode,
          profileData.country,
          profileData.state,
          profileData.city,
          profileData.neighborhood,
          profileData.addressLine
        ])
      ],
      [
        "Moneda",
        previousProfile?.currency,
        profileData.currency
      ]
    ]
      .filter(([, previousValue, nextValue]) =>
        previousValue !== nextValue
      )
      .map(([section]) => section);

    const profile = await prisma.$transaction(async (transaction) => {
      const savedProfile = await transaction.businessProfile.upsert({
        where: {
          tenantId: user.tenantId
        },
        create: {
          tenantId: user.tenantId,
          ...profileData
        },
        update: profileData
      });

      await transaction.tenant.update({
        where: {
          id: user.tenantId
        },
        data: {
          businessName
        }
      });

      await transaction.businessConfigurationAudit.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          fieldName:
            modifiedSections.join(",") ||
            "Configuración general",
          previousValue: previousProfile
            ? JSON.stringify(previousProfile)
            : null,
          newValue: JSON.stringify(savedProfile)
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

      return savedProfile;
    });

    const latestAudit = await prisma.businessConfigurationAudit.findFirst({
      where: {
        tenantId: user.tenantId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      success: true,
      profile,
      lastModification: latestAudit
        ? {
            createdAt: latestAudit.createdAt,
            user: user.email,
            modifiedSections: modifiedSections.length
              ? modifiedSections
              : ["Configuración general"]
          }
        : null
    });
  } catch (error) {
    console.error("SETTINGS PROFILE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudieron guardar los cambios"
      },
      { status: 500 }
    );
  }
}
