"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import StarRating from "@/src/components/ui/star-rating";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string | null;
  createdAt: Date | string;
};

type ReviewResponse = {
  error?: string;
  review?: Review;
};

export default function StoreReviews({
  tenantId,
  reviews,
  averageRating,
  reviewCount,
}: {
  tenantId: string;
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
}) {
  const [visibleReviews, setVisibleReviews] = useState(reviews);
  const [average, setAverage] = useState(averageRating);
  const [count, setCount] = useState(reviewCount);
  const [customerStatus, setCustomerStatus] = useState<"loading" | "active" | "guest">("loading");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { role?: string } | null }) => {
        if (!cancelled) setCustomerStatus(data.user?.role === "customer" ? "active" : "guest");
      })
      .catch(() => {
        if (!cancelled) setCustomerStatus("guest");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (rating < 1 || rating > 5) {
      setError("Selecciona una calificación de una a cinco estrellas.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/store-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, rating, comment }),
      });
      const data: ReviewResponse = await response.json();

      if (!response.ok || !data.review) {
        if (response.status === 401) setCustomerStatus("guest");
        setError(data.error || "No se pudo guardar tu reseña.");
        return;
      }

      const newReview = data.review;
      setVisibleReviews((current) => [newReview, ...current].slice(0, 10));
      setAverage((current) => (current * count + rating) / (count + 1));
      setCount((current) => current + 1);
      setRating(0);
      setComment("");
      setSuccess("Gracias por compartir tu opinión.");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-dark">Reseñas de nuestros clientes</h2>
        {count > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={average} />
            <span className="text-sm font-medium text-muted">
              {average.toFixed(1)} · {count} {count === 1 ? "opinión" : "opiniones"}
            </span>
          </div>
        )}
      </div>

      {visibleReviews.length === 0 ? (
        <div className="rounded border border-border p-5">
          <p className="text-sm text-muted">Este negocio aún no cuenta con reseñas. Sé el primero en calificarlo.</p>
          {customerStatus === "guest" && (
            <Link href="/login" className="mt-4 inline-flex rounded bg-action px-4 py-2 text-sm font-medium text-white">
              Iniciar sesión
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleReviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-dark">{review.customerName || "Cliente"}</span>
                <StarRating rating={review.rating} size={14} />
              </div>
              {review.comment && <p className="mt-2 text-sm text-muted">{review.comment}</p>}
              <p className="mt-3 text-xs text-muted">
                {new Date(review.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}

      {customerStatus === "active" ? (
        <form onSubmit={submitReview} className="mt-6 max-w-xl space-y-4">
          <h3 className="text-lg font-semibold text-dark">Califica este negocio</h3>
          <div className="flex gap-1" role="group" aria-label="Selecciona una calificación">
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`Calificar con ${value} ${value === 1 ? "estrella" : "estrellas"}`}
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                  className="cursor-pointer p-1"
                >
                  <Star size={24} className={value <= rating ? "fill-action text-action" : "text-slate-400"} />
                </button>
              );
            })}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Cuéntanos cómo fue tu experiencia (opcional)"
            className="w-full rounded border border-border p-3"
          />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {success && <p role="status" className="text-sm text-green-700">{success}</p>}
          <button type="submit" disabled={submitting || rating === 0} className="rounded bg-action px-5 py-2.5 font-medium text-white disabled:bg-gray-400">
            {submitting ? "Enviando..." : "Enviar reseña"}
          </button>
        </form>
      ) : customerStatus === "guest" && visibleReviews.length > 0 ? (
        <Link href="/login" className="mt-6 inline-flex rounded bg-action px-4 py-2 text-sm font-medium text-white">
          Inicia sesión para calificar
        </Link>
      ) : null}
    </section>
  );
}
