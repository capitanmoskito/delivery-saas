"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Phone, X } from "lucide-react";

import DeliveryMap, { type MapPoint } from "@/src/components/delivery/delivery-map";
import type { Coordinates } from "@/src/modules/delivery/route-optimizer";
import type { DeliveryRouteResponse, DeliveryStop, DropStop } from "@/src/modules/delivery/types";

const storageKey = "tupedidos_delivery_codes";

function readCodes(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((code): code is string => typeof code === "string" && /^\d{4}$/.test(code)) : [];
  } catch {
    return [];
  }
}

function elapsedLabel(startedAt: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

function mapsUrl(stop: DeliveryStop) {
  const destination = stop.latitude !== null && stop.longitude !== null ? `${stop.latitude},${stop.longitude}` : stop.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export default function DeliveryPage() {
  const [codes, setCodes] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [inputs, setInputs] = useState<string[]>(["", "", ""]);
  const [message, setMessage] = useState("");
  const [route, setRoute] = useState<DeliveryRouteResponse | null>(null);
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sharing, setSharing] = useState(false);
  const [recipients, setRecipients] = useState<Record<string, string>>({});
  const lastPosition = useRef<Coordinates | null>(null);
  const codesRef = useRef<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCodes(readCodes());
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        const coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        lastPosition.current = coordinates;
        setOrigin(coordinates);
      },
      () => undefined,
      { maximumAge: 5000, enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  useEffect(() => {
    codesRef.current = codes;
  }, [codes]);

  useEffect(() => {
    if (!sharing) return;
    async function send() {
      const position = lastPosition.current;
      if (!position || codesRef.current.length === 0) return;
      await fetch("/api/delivery/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: codesRef.current, ...position }),
      }).catch(() => undefined);
    }
    void send();
    const interval = window.setInterval(() => void send(), 5000);
    return () => window.clearInterval(interval);
  }, [sharing]);

  const saveCodes = useCallback((next: string[]) => {
    setCodes(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }, []);

  // Rounded so small GPS drift does not trigger a new route request.
  const originKey = origin ? `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}` : "";

  useEffect(() => {
    if (!loaded || codes.length === 0) return;
    let cancelled = false;
    async function load() {
      const [latitude, longitude] = originKey ? originKey.split(",").map(Number) : [];
      const response = await fetch("/api/delivery/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes, origin: originKey ? { latitude, longitude } : undefined }),
      });
      if (cancelled) return;
      if (response.status === 429) {
        setMessage("Demasiados intentos. Intenta de nuevo en unos minutos.");
        return;
      }
      if (!response.ok) return;
      const data = (await response.json()) as DeliveryRouteResponse;
      setRoute(data);
      setNow(Date.now());
      if (data.invalidCodes.length > 0) {
        setMessage(`Se quitaron códigos vencidos o ya entregados: ${data.invalidCodes.join(", ")}`);
        const next = codes.filter((code) => !data.invalidCodes.includes(code));
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        setCodes(next);
      }
    }
    void load();
    const interval = window.setInterval(() => void load(), 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [codes, loaded, originKey]);

  function addCode(event: React.FormEvent) {
    event.preventDefault();
    const filled = inputs.map((value) => value.trim()).filter(Boolean);
    if (filled.length === 0 || filled.some((code) => !/^\d{4}$/.test(code))) {
      setMessage("Cada código debe tener 4 dígitos. Deja vacías las secciones que no uses.");
      return;
    }
    setMessage("");
    setInputs(["", "", ""]);
    const merged = [...new Set([...codes, ...filled])].slice(0, 25);
    if (merged.length !== codes.length) saveCodes(merged);
  }

  function updateInput(index: number, value: string) {
    setInputs((current) => current.map((item, position) => (position === index ? value.replace(/\D/g, "").slice(0, 4) : item)));
  }

  function removeCode(code: string) {
    saveCodes(codes.filter((current) => current !== code));
  }

  async function completeDelivery(stop: DropStop) {
    const recipientName = (recipients[stop.code] ?? "").trim();
    if (recipientName.length < 2) {
      setMessage("Escribe el nombre de quien recibe el pedido.");
      return;
    }
    const response = await fetch("/api/delivery/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: stop.code, recipientName }),
    });
    if (!response.ok) {
      setMessage("No se pudo marcar como entregado.");
      return;
    }
    removeCode(stop.code);
    setRoute((current) => (current ? { ...current, steps: current.steps.filter((step) => step.type !== "drop" || step.code !== stop.code) } : current));
  }

  const steps = useMemo(() => (codes.length === 0 ? [] : (route?.steps ?? []).filter((step): step is DropStop => step.type === "drop" && codes.includes(step.code))), [route, codes]);
  const mapPoints = useMemo<MapPoint[]>(() => {
    let drop = 0;
    const points: MapPoint[] = [];
    if (origin) points.push({ ...origin, label: "Tú", kind: "origin" });
    for (const step of steps) {
      drop += 1;
      if (step.latitude === null || step.longitude === null) continue;
      points.push({ latitude: step.latitude, longitude: step.longitude, label: String(drop), kind: "drop" });
    }
    return points;
  }, [steps, origin]);

  const dropNumbers = new Map(steps.map((step, index) => [step.code, index + 1]));

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-dark">Reparto TuPedidos</h1>
      <p className="mt-1 text-sm text-slate-600">Ingresa un código de envío de 4 dígitos por sección; usa «Agregar más» si llevas más pedidos. La ruta empieza en el negocio y va de la entrega más cercana a la más lejana.</p>

      <form onSubmit={addCode} className="mt-4 space-y-3">
        {inputs.map((value, index) => (
          <section key={index} className="rounded-2xl border border-border bg-white p-3">
            <label className="block text-xs font-semibold text-slate-500">
              Envío {index + 1}
              <input
                value={value}
                onChange={(event) => updateInput(index, event.target.value)}
                inputMode="numeric"
                placeholder="0000"
                aria-label={`Código de envío ${index + 1}`}
                className="mt-1 block h-12 w-full rounded-xl border border-border bg-white px-4 text-center text-xl font-bold tracking-widest"
              />
            </label>
          </section>
        ))}
        <div className="flex gap-2">
          <button type="button" onClick={() => setInputs((current) => [...current, ""])} disabled={inputs.length >= 25} className="h-12 flex-1 rounded-xl border border-border bg-white px-4 font-medium text-dark disabled:opacity-50">+ Agregar más</button>
          <button type="submit" className="h-12 flex-1 rounded-xl bg-action px-5 font-medium text-white">Agregar códigos</button>
        </div>
      </form>
      <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
        <span>
          <span className="block font-semibold text-dark">Compartir mi ubicación</span>
          <span className="block text-sm text-slate-600">Tus clientes verán en tiempo real dónde vas. Déjala activa mientras repartes.</span>
        </span>
        <input type="checkbox" checked={sharing} onChange={(event) => setSharing(event.target.checked)} className="h-6 w-6 accent-[#D95D39]" />
      </label>
      {sharing && !origin && <p className="mt-2 text-sm text-amber-700">Esperando tu ubicación… activa el permiso de ubicación en el navegador.</p>}
      {message && <p role="alert" className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}

      {codes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {codes.map((code) => (
            <span key={code} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pr-1 pl-3 text-sm font-semibold">
              {code}
              <button type="button" onClick={() => removeCode(code)} aria-label={`Quitar código ${code}`} className="rounded-full p-1 hover:bg-slate-200"><X size={14} /></button>
            </span>
          ))}
        </div>
      )}

      {steps.length > 0 && (
        <p className="mt-4 text-sm text-slate-600">Ruta sugerida · {steps.length} entregas{route && route.distanceKm > 0 ? ` · ≈ ${route.distanceKm} km` : ""}</p>
      )}
      {mapPoints.length > 0 && <div className="mt-3"><DeliveryMap points={mapPoints} /></div>}

      <ol className="mt-4 space-y-3">
        {steps.map((step) => {
          return (
            <li key={step.code} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-action">ENTREGA {dropNumbers.get(step.code)} · Código {step.code}</p>
                  <p className="mt-1 text-lg font-bold text-dark">{step.customerName || "Cliente"}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">#{step.orderNumber || "—"}</p>
                  <p className="text-slate-600">{elapsedLabel(step.startedAt, now)}</p>
                </div>
              </div>
              <p className="mt-2 flex items-start gap-1 text-sm"><MapPin size={16} className="mt-0.5 shrink-0" /> {step.address || "Sin dirección"}</p>
              {step.reference && <p className="text-sm text-slate-600">Ref: {step.reference}</p>}
              {step.phone && <a href={`tel:${step.phone}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-action"><Phone size={14} /> {step.phone}</a>}
              <p className="mt-2 text-sm text-slate-600">{step.businessName}</p>
              <ul className="mt-1 text-sm">{step.items.map((item, index) => <li key={`${item.name}-${index}`}>{item.quantity}x {item.name}</li>)}</ul>
              {step.paymentStatus !== "paid" && <p className="mt-2 text-sm font-semibold text-amber-700">Cobrar al entregar: ${step.total.toFixed(2)}</p>}
              <label className="mt-3 block text-sm font-medium">
                Nombre de quien recibe
                <input
                  value={recipients[step.code] ?? ""}
                  onChange={(event) => setRecipients((current) => ({ ...current, [step.code]: event.target.value }))}
                  maxLength={80}
                  placeholder="Ej. María López"
                  className="mt-1 block h-11 w-full rounded-xl border border-border bg-white px-3 font-normal"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <a href={mapsUrl(step)} target="_blank" rel="noreferrer" className="flex-1 rounded-xl border border-border px-4 py-2.5 text-center text-sm font-medium">Navegar</a>
                <button type="button" onClick={() => void completeDelivery(step)} className="flex-1 rounded-xl bg-action px-4 py-2.5 text-sm font-medium text-white">Entregado</button>
              </div>
            </li>
          );
        })}
      </ol>
      {loaded && codes.length === 0 && <p className="mt-8 text-center text-slate-500">Aún no has agregado códigos.</p>}
    </main>
  );
}
