"use client";

import { useState } from "react";

import MapPicker from "@/src/components/location/map-picker";

export type AddressValue = {
  street: string;
  postalCode: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  reference: string;
  contactPhone: string;
  latitude: number | null;
  longitude: number | null;
};

type PostalCodeResponse = {
  country: string;
  state: string;
  city: string;
  neighborhoods: string[];
  message?: string;
};

type AddressFieldsProps = {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  includeContact?: boolean;
  disabled?: boolean;
};

export default function AddressFields({ value, onChange, includeContact = true, disabled = false }: AddressFieldsProps) {
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [locationMessage, setLocationMessage] = useState("");

  function update(field: keyof AddressValue, fieldValue: string | number | null) {
    onChange({ ...value, [field]: fieldValue });
  }

  async function lookupPostalCode(postalCode: string) {
    update("postalCode", postalCode);

    if (!/^\d{5}$/.test(postalCode)) {
      setNeighborhoods([]);
      return;
    }

    const response = await fetch(`/api/location/postal-code?postalCode=${encodeURIComponent(postalCode)}`);
    const data: PostalCodeResponse = await response.json();

    if (!response.ok || !data.state) {
      setLocationMessage(data.message || "No se encontraron datos para ese código postal.");
      setNeighborhoods([]);
      return;
    }

    const nextNeighborhoods = data.neighborhoods || [];
    setNeighborhoods(nextNeighborhoods);
    onChange({
      ...value,
      postalCode,
      country: data.country || "México",
      state: data.state,
      city: data.city,
      neighborhood: nextNeighborhoods.includes(value.neighborhood) ? value.neighborhood : (nextNeighborhoods[0] || "")
    });
    setLocationMessage("");
  }

  async function locateAddress() {
    const address = [value.street, value.neighborhood, value.city, value.state, value.postalCode, value.country]
      .filter(Boolean)
      .join(", ");

    if (!address) {
      return;
    }

    const response = await fetch("/api/location/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address })
    });
    const data: { success?: boolean; latitude?: number; longitude?: number; message?: string } = await response.json();

    if (!response.ok || !data.success || data.latitude === undefined || data.longitude === undefined) {
      setLocationMessage(data.message || "No se pudo ubicar la dirección.");
      return;
    }

    onChange({ ...value, latitude: data.latitude, longitude: data.longitude });
    setLocationMessage("");
  }

  return (
    <div className="space-y-3">
      <input disabled={disabled} className="w-full border p-2 disabled:bg-slate-100" placeholder="Calle y número" value={value.street} onChange={(event) => update("street", event.target.value)} onBlur={() => void locateAddress()} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input disabled={disabled} className="border p-2 disabled:bg-slate-100" inputMode="numeric" maxLength={5} placeholder="Código Postal" value={value.postalCode} onChange={(event) => void lookupPostalCode(event.target.value.replace(/\D/g, ""))} />
        <select disabled={disabled} className="border p-2 disabled:bg-slate-100" value={value.neighborhood} onChange={(event) => update("neighborhood", event.target.value)}>
          <option value="">Colonia</option>
          {(neighborhoods.includes(value.neighborhood) ? neighborhoods : [value.neighborhood, ...neighborhoods].filter(Boolean)).map((neighborhood) => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input disabled={disabled} className="border p-2 disabled:bg-slate-100" placeholder="Municipio / ciudad" value={value.city} onChange={(event) => update("city", event.target.value)} />
        <input disabled={disabled} className="border p-2 disabled:bg-slate-100" placeholder="Estado" value={value.state} onChange={(event) => update("state", event.target.value)} />
      </div>
      {includeContact && <><input disabled={disabled} className="w-full border p-2 disabled:bg-slate-100" placeholder="Referencia de entrega" value={value.reference} onChange={(event) => update("reference", event.target.value)} /><input disabled={disabled} className="w-full border p-2 disabled:bg-slate-100" inputMode="tel" placeholder="Teléfono de contacto" value={value.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} /></>}
      <button type="button" disabled={disabled} onClick={() => void locateAddress()} className="rounded border px-3 py-2 text-sm disabled:bg-slate-100">Ubicar dirección en el mapa</button>
      {locationMessage && <p className="text-sm text-red-600">{locationMessage}</p>}
      <MapPicker latitude={value.latitude} longitude={value.longitude} disabled={disabled} onChange={(coordinates) => onChange({ ...value, ...coordinates })} />
    </div>
  );
}