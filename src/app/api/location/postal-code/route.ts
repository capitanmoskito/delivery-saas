import { NextResponse }
from "next/server";

import { lookupPostalCode }
from "@/src/modules/settings/postal-code.service";

export async function GET(request: Request) {

  const postalCode =
    new URL(request.url).searchParams.get(
      "postalCode"
    ) || "";

  if (!process.env.COPOMEX_TOKEN) {
    return NextResponse.json(
      {
        message: "COPOMEX no está configurado"
      },
      {
        status: 503
      }
    );
  }

  const result =
    await lookupPostalCode(
      postalCode
    );

  if (!result) {
    return NextResponse.json(
      {
        message: "No se encontraron datos para ese código postal"
      },
      {
        status: 404
      }
    );
  }

  return NextResponse.json({

    country:
      result.country,

    state:
      result.state,

    city:
      result.city,

    neighborhoods:
      result.neighborhoods
  });
}