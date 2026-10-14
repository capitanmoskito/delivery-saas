"use client";

import { useState } from "react";

export default function PayButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data: { url?: string; error?: string } = await response.json();
      if (!response.ok || !data.url) {
        setError(data.error || "No se pudo iniciar el pago.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={loading}
        className="w-full rounded-xl bg-[#D95D39] px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {loading ? "Redirigiendo a Clip..." : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
