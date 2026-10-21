import { prisma } from "@/src/lib/prisma";

export type TenantAnnouncement = {
  id: string;
  type: "text" | "image";
  title: string | null;
  message: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
};

// The seed is fixed at login, so the same notice is shown during the whole session.
export async function getAnnouncementForSession(seed: string | undefined): Promise<TenantAnnouncement | null> {
  const now = new Date();
  const announcements = await prisma.platformAnnouncement.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  if (announcements.length === 0) return null;

  const parsed = Number.parseInt(seed ?? "", 10);
  const index = Number.isFinite(parsed) ? parsed % announcements.length : Math.floor(Math.random() * announcements.length);
  const selected = announcements[index];
  return {
    id: selected.id,
    type: selected.type === "image" ? "image" : "text",
    title: selected.title,
    message: selected.message,
    imageUrl: selected.imageUrl,
    linkUrl: selected.linkUrl,
  };
}
