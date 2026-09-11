import { NextResponse }
from "next/server";

import { lookupPostalCode }
from "@/src/modules/settings/postal-code.service";

export async function GET(request: Request) {

  const postalCode =
    new URL(request.url).searchParams.get(
      "postalCode"
    ) || "";

  const result =
    await lookupPostalCode(
      postalCode
    );

  return NextResponse.json({

    country:
      result?.country || "México",

    state:
      result?.state || "",

    city:
      result?.city || "",

    neighborhoods:
      result
        ? [result.neighborhood]
        : []
  });
}