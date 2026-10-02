"use client";

import { useEffect, useState } from "react";

import AddressFields, { type AddressValue } from "@/src/components/location/address-fields";
import MarketplaceHeader from "@/src/components/marketplace-header";

const emptyAddress: AddressValue = { street: "", postalCode: "", neighborhood: "", city: "", state: "", country: "México", reference: "", contactPhone: "", latitude: null, longitude: null };

export default function CustomerProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<AddressValue>(emptyAddress);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const response = await fetch("/api/customer/profile");
      const data: { firstName?: string; lastNamePaternal?: string; email?: string; customerAddresses?: Array<Record<string, unknown>>; error?: string } = await response.json();
      if (!response.ok) { setError(data.error || "Inicia sesión para ver tu perfil"); return; }
      setFirstName(data.firstName || ""); setLastName(data.lastNamePaternal || ""); setEmail(data.email || "");
      const saved = data.customerAddresses?.[0];
      if (saved) setAddress({ street: String(saved.street || ""), postalCode: String(saved.postalCode || ""), neighborhood: String(saved.neighborhood || ""), city: String(saved.city || ""), state: String(saved.state || ""), country: String(saved.country || "México"), reference: String(saved.reference || ""), contactPhone: String(saved.contactPhone || ""), latitude: typeof saved.latitude === "number" ? saved.latitude : null, longitude: typeof saved.longitude === "number" ? saved.longitude : null });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!/^\d{10}$/.test(address.contactPhone)) {
      setError("El teléfono de contacto debe tener exactamente 10 dígitos.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/customer/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName, lastName, ...address }) });
      const data: { error?: string } = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo guardar el perfil"); return; }
      setMessage("Perfil guardado correctamente");
    } catch { setError("No se pudo conectar con el servidor"); } finally { setSaving(false); }
  }

  return (
    <>
      <MarketplaceHeader customerArea />
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-bold">Mi perfil</h1>
        <form onSubmit={save} className="mt-6 space-y-4 rounded border p-5">
          <p className="text-sm text-muted">Los campos marcados con * son obligatorios.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">Nombre *
              <input required className="w-full border p-3 font-normal" placeholder="Nombre" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium">Apellido *
              <input required className="w-full border p-3 font-normal" placeholder="Apellido" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </label>
          </div>
          <label className="block space-y-1 text-sm font-medium">Correo electrónico *
            <input required type="email" className="w-full border bg-slate-100 p-3 font-normal" value={email} readOnly />
          </label>
          <h2 className="pt-3 text-xl font-semibold">Dirección de entrega</h2>
          <AddressFields value={address} onChange={setAddress} requiredFields />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
          <button type="submit" disabled={saving} className="rounded bg-action px-5 py-3 text-white disabled:bg-gray-400">
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
        </form>
      </main>
    </>
  );
}