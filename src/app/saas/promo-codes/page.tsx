"use client";

import { useEffect, useState } from "react";

type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  discountPercent: number;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
};

const emptyForm = { code: "", description: "", discountPercent: 10, usageLimit: "", startsAt: "", endsAt: "" };

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/saas/promo-codes");
    setPromoCodes(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/saas/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          discountPercent: Number(form.discountPercent),
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error ?? "No se pudo crear el código");
        return;
      }

      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(promoCode: PromoCode) {
    await fetch(`/api/saas/promo-codes/${promoCode.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !promoCode.active })
    });
    await load();
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Códigos promocionales</h1>

      <form onSubmit={handleSubmit} className="mb-8 grid gap-3 rounded border p-4 md:grid-cols-2">
        <input
          placeholder="Código (ej. BIENVENIDO15)"
          className="border p-2"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          required
        />

        <input
          placeholder="Descripción"
          className="border p-2"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <input
          type="number"
          placeholder="% de descuento"
          className="border p-2"
          value={form.discountPercent}
          onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
          min={0}
          max={100}
          required
        />

        <input
          type="number"
          placeholder="Límite de usos (opcional)"
          className="border p-2"
          value={form.usageLimit}
          onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
        />

        <input
          type="date"
          className="border p-2"
          value={form.startsAt}
          onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
        />

        <input
          type="date"
          className="border p-2"
          value={form.endsAt}
          onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
        />

        <button type="submit" disabled={saving} className="rounded bg-action px-4 py-2 text-white disabled:bg-gray-400 md:col-span-2">
          {saving ? "Guardando..." : "Crear código"}
        </button>
      </form>

      <div className="space-y-4">
        {promoCodes.map((promoCode) => (
          <div key={promoCode.id} className="flex items-center justify-between rounded border p-4">
            <div>
              <h2 className="font-bold">{promoCode.code}</h2>
              {promoCode.description && <p className="text-sm text-slate-600">{promoCode.description}</p>}
              <p className="text-sm">
                {promoCode.discountPercent}% de descuento · {promoCode.usedCount} usos
                {promoCode.usageLimit ? ` / ${promoCode.usageLimit}` : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleActive(promoCode)}
              className={`rounded px-3 py-1 text-sm font-medium ${promoCode.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
            >
              {promoCode.active ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
