export interface PostalCodeLookup {
  postalCode: string;
  country: string;
  state: string;
  city: string;
  neighborhoods: string[];
}

export async function lookupPostalCode(
  postalCode: string
): Promise<PostalCodeLookup | null> {
  if (!/^\d{5}$/.test(postalCode)) {
    return null;
  }

  const token = process.env.COPOMEX_TOKEN;

  if (!token) {
    return null;
  }

  const response = await fetch(
    `https://api.copomex.com/query/info_cp/${postalCode}?type=simplified&token=${encodeURIComponent(token)}`,
    { next: { revalidate: 86400 } }
  );

  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json();

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const document = payload as { error?: unknown; response?: unknown };

  if (document.error === true || !document.response || typeof document.response !== "object") {
    return null;
  }

  const record = document.response;

  const data = record as Record<string, unknown>;

  return {
    postalCode,
    country: "México",
    state: String(data.estado ?? ""),
    city: String(data.municipio ?? data.ciudad ?? ""),
    neighborhoods: Array.from(new Set(
      (Array.isArray(data.asentamiento) ? data.asentamiento : [data.asentamiento])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    ))
  };
}