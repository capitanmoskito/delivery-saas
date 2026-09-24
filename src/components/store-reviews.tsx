import StarRating from "@/src/components/ui/star-rating";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string | null;
  createdAt: Date;
};

export default function StoreReviews({ reviews, averageRating, reviewCount }: { reviews: Review[]; averageRating: number; reviewCount: number }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-dark">Reseñas de nuestros clientes</h2>
        {reviewCount > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={averageRating} />
            <span className="text-sm font-medium text-muted">
              {averageRating.toFixed(1)} · {reviewCount} {reviewCount === 1 ? "opinión" : "opiniones"}
            </span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">Aún no hay reseñas para este negocio.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-dark">{review.customerName || "Cliente"}</span>
                <StarRating rating={review.rating} size={14} />
              </div>
              {review.comment && <p className="mt-2 text-sm text-muted">{review.comment}</p>}
              <p className="mt-3 text-xs text-muted">
                {review.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
