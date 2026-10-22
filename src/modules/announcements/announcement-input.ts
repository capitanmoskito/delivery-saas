export type AnnouncementInput = {
  type: "text" | "image";
  title: string | null;
  message: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  sortOrder: number;
};

function optionalText(value: unknown, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, max) : null;
}

function optionalDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function safeLink(value: unknown) {
  const link = optionalText(value, 500);
  if (!link) return null;
  return link.startsWith("/") && !link.startsWith("//") || /^https?:\/\//i.test(link) ? link : undefined;
}

export function parseAnnouncement(body: unknown): { data: AnnouncementInput } | { error: string } {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const type = input.type === "image" ? "image" : "text";
  const message = optionalText(input.message, 500);
  const imageUrl = optionalText(input.imageUrl, 500);
  const startsAt = optionalDate(input.startsAt);
  const endsAt = optionalDate(input.endsAt);
  const linkUrl = safeLink(input.linkUrl);
  const sortOrder = Number.isInteger(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;

  if (type === "text" && !message) return { error: "Escribe el mensaje del aviso." };
  if (type === "image" && !imageUrl) return { error: "Sube una imagen para el aviso." };
  if (startsAt === undefined || endsAt === undefined) return { error: "Fecha no válida." };
  if (startsAt && endsAt && endsAt < startsAt) return { error: "La fecha final debe ser posterior a la inicial." };
  if (linkUrl === undefined) return { error: "El enlace debe iniciar con / o http(s)://." };

  return {
    data: {
      type,
      title: optionalText(input.title, 120),
      message: type === "text" ? message : null,
      imageUrl: type === "image" ? imageUrl : null,
      linkUrl,
      active: input.active !== false,
      startsAt,
      endsAt,
      sortOrder
    }
  };
}
