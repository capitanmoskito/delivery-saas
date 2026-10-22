import { Star } from "lucide-react";

import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

type Entry = { id: string; name: string; subtitle: string | null; rating: number; comment: string | null; date: Date };

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} className={value <= Math.round(rating) ? "fill-secondary text-secondary" : "text-slate-300"} />)}
    </span>
  );
}

function Section({ title, entries, empty }: { title: string; entries: Entry[]; empty: string }) {
  const average = entries.length ? entries.reduce((total, entry) => total + entry.rating, 0) / entries.length : 0;

  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-dark">{title}</h2>
        {entries.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars rating={average} />
            <span className="font-semibold">{average.toFixed(1)}</span>
            <span className="text-slate-500">({entries.length} {entries.length === 1 ? "evaluación" : "evaluaciones"})</span>
          </div>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-dark">{entry.name}</p>
                  {entry.subtitle && <p className="truncate text-xs text-slate-500">{entry.subtitle}</p>}
                </div>
                <Stars rating={entry.rating} />
              </div>
              {entry.comment ? <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-slate-700">{entry.comment}</p> : <p className="mt-2 text-sm italic text-slate-400">Sin comentario</p>}
              <p className="mt-2 text-xs text-slate-400">{entry.date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function TestimonialsPage() {
  const [businessReviews, customerReviews] = await Promise.all([
    prisma.businessTestimonial.findMany({ where: { tenantId: { not: null } }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.platformReview.findMany({ orderBy: { updatedAt: "desc" }, take: 200 })
  ]);

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-3xl font-bold">Testimonios y calificaciones</h1>
      <Section
        title="Negocios evalúan la plataforma"
        empty="Aún no hay evaluaciones de negocios."
        entries={businessReviews.map((review) => ({ id: review.id, name: review.businessName, subtitle: review.city || null, rating: review.rating, comment: review.testimonial || null, date: review.updatedAt }))}
      />
      <Section
        title="Clientes evalúan su experiencia de compra"
        empty="Aún no hay evaluaciones de clientes."
        entries={customerReviews.map((review) => ({ id: review.id, name: review.authorName, subtitle: null, rating: review.rating, comment: review.comment, date: review.updatedAt }))}
      />
    </div>
  );
}
