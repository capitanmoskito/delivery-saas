import { NextResponse }
from "next/server";

export async function POST(request: Request) {

  const token = process.env.MAPBOX_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Mapbox no está configurado" },
      { status: 503 }
    );
  }

  const body: unknown = await request.json();
  const address = body && typeof body === "object"
    ? String((body as Record<string, unknown>).address ?? "").trim()
    : "";

  if (!address) {
    return NextResponse.json(
      { success: false, message: "Dirección no válida" },
      { status: 400 }
    );
  }

  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&limit=1&access_token=${encodeURIComponent(token)}`
  );

  if (!response.ok) {
    return NextResponse.json(
      { success: false, message: "No se pudo ubicar la dirección" },
      { status: 502 }
    );
  }

  const data: unknown = await response.json();
  const feature = data && typeof data === "object" && Array.isArray((data as { features?: unknown }).features)
    ? (data as { features: Array<{ geometry?: { coordinates?: unknown } }> }).features[0]
    : undefined;
  const coordinates = feature?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || typeof coordinates[0] !== "number" || typeof coordinates[1] !== "number") {
    return NextResponse.json(
      { success: false, message: "No se encontraron coordenadas" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    latitude: coordinates[1],
    longitude: coordinates[0]
  });
}