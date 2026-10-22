"use client";

import { Star } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

export default function PlatformReviewForm({ title, description }: { title: string; description: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/platform-reviews")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { review?: { rating: number; comment: string | null } | null } | null) => {
        if (!active || !data?.review) return;
        setRating(data.review.rating);
        setComment(data.review.comment ?? "");
        setSaved(true);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (rating < 1) { setError("Elige una calificación."); return; }
    setSaving(true);
    const response = await fetch("/api/platform-reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, comment }) }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      const data: { error?: string } | null = await response?.json().catch(() => null) ?? null;
      setError(data?.error || "No se pudo guardar tu evaluación.");
      return;
    }
    setSaved(true);
    setMessage("¡Gracias por tu evaluación!");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-2xl border bg-white p-5">
      <h2 className="text-lg font-bold text-dark">{title}</h2>
      <p className="text-sm text-slate-600">{description}</p>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} estrellas`} onClick={() => setRating(value)}>
            <Star size={28} className={value <= rating ? "fill-secondary text-secondary" : "text-slate-300"} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} placeholder="Cuéntanos tu experiencia (opcional)" className="mt-3 w-full rounded border p-3" />
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="mt-2 text-sm text-green-700">{message}</p>}
      <button type="submit" disabled={saving} className="mt-3 rounded-full bg-action px-5 py-2.5 font-medium text-white disabled:opacity-60">{saving ? "Guardando..." : saved ? "Actualizar evaluación" : "Enviar evaluación"}</button>
    </form>
  );
}
