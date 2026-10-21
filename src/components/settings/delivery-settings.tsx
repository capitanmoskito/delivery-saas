"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import type { DeliveryFeeSettings } from "@/src/modules/delivery/delivery-fee";

type FormState = Omit<DeliveryFeeSettings, "maxDistanceKm"> & { maxDistanceKm: string };

const emptyForm: FormState = { pickupEnabled: true, deliveryEnabled: false, feeType: "fixed", fixedFee: 0, perKmFee: 0, maxDistanceKm: "" };

export default function DeliverySettings({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/delivery")
      .then(async (response) => {
        const data: DeliveryFeeSettings & { error?: string } = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar la configuración de envíos.");
        if (!cancelled) setForm({ ...data, maxDistanceKm: data.maxDistanceKm === null ? "" : String(data.maxDistanceKm) });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo cargar la configuración de envíos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, maxDistanceKm: form.maxDistanceKm.trim() === "" ? null : Number(form.maxDistanceKm) }),
      });
      const data: { error?: string } = await response.json();
      if (!response.ok) {
        setError(data.error || "No se pudo guardar la configuración de envíos.");
        return;
      }
      onSaved();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border p-8">
      <h2 className="mb-2 text-2xl font-bold">Envíos y recolección</h2>
      <p className="mb-6 text-sm text-slate-600">Define cómo reciben sus pedidos tus clientes. El costo por kilómetro se calcula en el checkout con la distancia entre tu negocio y la ubicación del cliente.</p>
      {loading ? (
        <p className="text-sm text-slate-500">Cargando configuración...</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.pickupEnabled} onChange={(event) => setForm((current) => ({ ...current, pickupEnabled: event.target.checked }))} />
              <span>Recoger en tienda</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.deliveryEnabled} onChange={(event) => setForm((current) => ({ ...current, deliveryEnabled: event.target.checked }))} />
              <span>Envío a domicilio</span>
            </label>
          </div>

          {form.deliveryEnabled && (
            <fieldset className="space-y-4 rounded border p-5">
              <legend className="px-2 font-semibold">Cobro del envío</legend>
              <div className="flex flex-wrap gap-3">
                <label className={`flex cursor-pointer items-center gap-2 rounded border px-4 py-3 ${form.feeType === "fixed" ? "border-action" : "border-border"}`}>
                  <input type="radio" name="feeType" checked={form.feeType === "fixed"} onChange={() => setForm((current) => ({ ...current, feeType: "fixed" }))} /> Por pedido (monto fijo)
                </label>
                <label className={`flex cursor-pointer items-center gap-2 rounded border px-4 py-3 ${form.feeType === "per_km" ? "border-action" : "border-border"}`}>
                  <input type="radio" name="feeType" checked={form.feeType === "per_km"} onChange={() => setForm((current) => ({ ...current, feeType: "per_km" }))} /> Por kilómetro
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {form.feeType === "fixed" ? (
                  <label className="space-y-1 text-sm font-medium">Costo de envío por pedido
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={form.fixedFee} onChange={(event) => setForm((current) => ({ ...current, fixedFee: Number(event.target.value) }))} className="w-full border p-3 font-normal" />
                  </label>
                ) : (
                  <label className="space-y-1 text-sm font-medium">Costo por kilómetro
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={form.perKmFee} onChange={(event) => setForm((current) => ({ ...current, perKmFee: Number(event.target.value) }))} className="w-full border p-3 font-normal" />
                  </label>
                )}
                <label className="space-y-1 text-sm font-medium">Distancia máxima de entrega en km (opcional)
                  <input type="number" min={0} step="0.1" inputMode="decimal" value={form.maxDistanceKm} onChange={(event) => setForm((current) => ({ ...current, maxDistanceKm: event.target.value }))} className="w-full border p-3 font-normal" />
                </label>
              </div>
              {(form.feeType === "per_km" || form.maxDistanceKm.trim() !== "") && (
                <p className="text-sm text-slate-600">Requiere que la ubicación de tu negocio (latitud y longitud) esté guardada en tu perfil.</p>
              )}
            </fieldset>
          )}

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded bg-action px-5 py-3 font-medium text-white disabled:bg-gray-400">
            <Save size={18} /> {saving ? "Guardando..." : "Guardar envíos"}
          </button>
        </div>
      )}
    </section>
  );
}
