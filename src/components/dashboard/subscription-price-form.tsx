"use client";

import { useState, type FormEvent } from "react";

export default function SubscriptionPriceForm({ initialPrice }: { initialPrice: number }) {
  const [price, setPrice] = useState(String(initialPrice));
  const [saved, setSaved] = useState(initialPrice);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    const response = await fetch("/api/saas/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthlyPrice: Number(price) }) }).catch(() => null);
    const data: { monthlyPrice?: number; error?: string } | null = await response?.json().catch(() => null) ?? null;
    setSaving(false);
    if (!response?.ok || typeof data?.monthlyPrice !== "number") { setError(data?.error || "No se pudo guardar el costo."); return; }
    setSaved(data.monthlyPrice);
    setPrice(String(data.monthlyPrice));
    setMessage("Costo actualizado. Aplica a los próximos pagos de los negocios.");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold text-dark">Costo del plan de suscripción</h2>
      <p className="text-sm text-slate-500">Costo mensual vigente: {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(saved)}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block text-sm font-medium">Nuevo costo mensual (MXN)
          <input type="number" min="1" step="0.01" required value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 block w-full rounded border p-2 sm:w-48" />
        </label>
        <button type="submit" disabled={saving} className="rounded bg-action px-5 py-2.5 font-medium text-white disabled:opacity-60">{saving ? "Guardando..." : "Guardar costo"}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="mt-2 text-sm text-green-700">{message}</p>}
    </form>
  );
}
