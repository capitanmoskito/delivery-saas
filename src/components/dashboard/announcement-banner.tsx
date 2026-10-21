import Link from "next/link";
import { Lightbulb } from "lucide-react";

import type { TenantAnnouncement } from "@/src/modules/announcements/announcement.service";

export default function AnnouncementBanner({ announcement }: { announcement: TenantAnnouncement }) {
  const content = announcement.type === "image" && announcement.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={announcement.imageUrl} alt={announcement.title || announcement.message || "Aviso de TuPedidos"} className="h-full max-h-22.5 w-full object-cover" />
  ) : (
    <div className="flex h-full items-center gap-3 px-4 py-3 sm:px-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-[#D95D39]"><Lightbulb size={20} /></span>
      <p className="line-clamp-3 text-sm text-[#2B2118] sm:text-base">
        {announcement.title && <strong className="mr-1">{announcement.title}:</strong>}
        {announcement.message}
      </p>
    </div>
  );

  return (
    <aside aria-label="Aviso de la plataforma" className="mb-6 h-auto max-h-22.5 min-h-14 overflow-hidden rounded-2xl border border-[#F4B942]/40 bg-linear-to-r from-[#F4B942]/25 to-[#D95D39]/15">
      {announcement.linkUrl ? <Link href={announcement.linkUrl} className="block h-full">{content}</Link> : content}
    </aside>
  );
}
