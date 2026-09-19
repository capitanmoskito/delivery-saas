"use client";

import { useEffect, useState } from "react";

import AddressFields, { type AddressValue } from "@/src/components/location/address-fields";

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

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/customer/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName, lastName, ...address }) });
      const data: { error?: string } = await response.json();
      if (!response.ok) { setError(data.error || "No se pudo guardar el perfil"); return; }
      setMessage("Perfil guardado correctamente");
    } catch { setError("No se pudo conectar con el servidor"); } finally { setSaving(false); }
  }

  return <main className="mx-auto max-w-3xl p-6"><h1 className="text-3xl font-bold">Mi perfil</h1><div className="mt-6 space-y-4 rounded border p-5"><div className="grid gap-3 sm:grid-cols-2"><input className="border p-3" placeholder="Nombre" value={firstName} onChange={(event) => setFirstName(event.target.value)} /><input className="border p-3" placeholder="Apellido" value={lastName} onChange={(event) => setLastName(event.target.value)} /></div><input className="w-full border bg-slate-100 p-3" value={email} readOnly /><h2 className="pt-3 text-xl font-semibold">Dirección de entrega</h2><AddressFields value={address} onChange={setAddress} />{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-green-700">{message}</p>}<button type="button" disabled={saving} onClick={save} className="rounded bg-action px-5 py-3 text-white disabled:bg-gray-400">{saving ? "Guardando..." : "Guardar perfil"}</button></div></main>;
}