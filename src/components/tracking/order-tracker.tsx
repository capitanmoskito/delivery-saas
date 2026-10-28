"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import OrderChat from "@/src/components/order-chat";
import TrackingMap from "@/src/components/tracking/tracking-map";
import { playChime } from "@/src/lib/alert-sound";
import { currencySymbols } from "@/src/lib/currency";

export type TrackedOrder = {
  id: string;
  orderNumber: string | null;
  status: string;
  readyAt: string | null;
  paymentStatus: string;
  fulfillmentType: string;
  total: number;
  currency: keyof typeof currencySymbols;
  restaurantId: string | null;
  businessName: string;
  deliveryAddress: string | null;
  destination: { latitude: number; longitude: number } | null;
  items: Array<{ name: string; quantity: number }>;
  deliveredToName: string | null;
  deliveryConfirmation: string | null;
  driver: { latitude: number; longitude: number; updatedAt: string; live: boolean } | null;
};

const labels: Record<string, string> = {
  pending_payment: "Esperando confirmación de tu pago",
  accepted: "Pedido aceptado",
  preparing: "Preparando tu pedido",
  ready_pickup: "Listo para recoger",
  ready_delivery: "Tu repartidor va en camino",
  delivered: "Entregado",
};

const ACKED_KEY = "tupedidos_ready_alert_acked";

type NotificationState = NotificationPermission | "unsupported";

function readAcked(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(ACKED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function readPermission(): NotificationState {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

async function showSystemNotification(title: string, body: string, tag: string) {
  const options: NotificationOptions = { body, tag, requireInteraction: true, icon: "/favicon.ico" };
  // Mobile browsers only allow notifications through a service worker registration.
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;
  if (registration) {
    await registration.showNotification(title, options);
    return;
  }
  new Notification(title, options);
}

function progress(order: TrackedOrder) {
  const steps = order.fulfillmentType === "delivery"
    ? ["accepted", "preparing", "ready_delivery", "delivered"]
    : ["accepted", "preparing", "ready_pickup", "delivered"];
  const index = Math.max(0, steps.indexOf(order.status));
  return Math.round(((index + 1) / steps.length) * 100);
}

export default function OrderTracker({ orders, onChanged }: { orders: TrackedOrder[]; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [acked, setAcked] = useState<string[]>(readAcked);
  const [permission, setPermission] = useState<NotificationState>(readPermission);
  const audioRef = useRef<AudioContext | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());
  const active = useMemo(() => orders.filter((order) => order.status !== "delivered" || order.deliveryConfirmation === "pending" || order.deliveryConfirmation === "disputed"), [orders]);
  const pendingAlerts = useMemo(() => orders.filter((order) => order.fulfillmentType === "pickup" && order.status === "ready_pickup" && !acked.includes(order.id)), [orders, acked]);
  const hasAlert = pendingAlerts.length > 0;

  function ensureAudio() {
    if (!audioRef.current && "AudioContext" in window) audioRef.current = new AudioContext();
    if (audioRef.current?.state === "suspended") void audioRef.current.resume();
    return audioRef.current;
  }

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => null);
    const unlock = () => { ensureAudio(); };
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);

  // The sound repeats until the customer presses "Detener alerta".
  useEffect(() => {
    if (!hasAlert) return;
    const ring = () => {
      const context = ensureAudio();
      if (context) playChime(context);
      if ("vibrate" in navigator) navigator.vibrate([300, 150, 300]);
    };
    ring();
    const timer = window.setInterval(ring, 2000);
    return () => window.clearInterval(timer);
  }, [hasAlert]);

  useEffect(() => {
    if (permission !== "granted") return;
    pendingAlerts.filter((order) => !notifiedRef.current.has(order.id)).forEach((order) => {
      notifiedRef.current.add(order.id);
      void showSystemNotification("¡Tu pedido está listo para recoger!", `${order.businessName} · Pedido #${order.orderNumber || order.id.slice(0, 8)}`, `ready-${order.id}`).catch(() => null);
    });
  }, [pendingAlerts, permission]);

  function stopAlert() {
    const next = Array.from(new Set([...acked, ...pendingAlerts.map((order) => order.id)]));
    window.localStorage.setItem(ACKED_KEY, JSON.stringify(next));
    setAcked(next);
  }

  async function enableNotifications() {
    ensureAudio();
    setPermission(await Notification.requestPermission());
  }

  if (active.length === 0) return null;

  async function respond(orderId: string, received: boolean) {
    setBusyId(orderId);
    setError("");
    const response = await fetch("/api/customer/orders/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, received }),
    }).catch(() => null);
    setBusyId(null);
    if (!response?.ok) {
      setError("No se pudo registrar tu respuesta. Intenta de nuevo.");
      return;
    }
    onChanged();
  }


  return (
    <section className="mt-6 space-y-4" aria-label="Seguimiento de pedidos">
      {hasAlert && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-action bg-action/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-dark">{pendingAlerts.length === 1 ? "¡Tu pedido está listo para recoger!" : `¡${pendingAlerts.length} pedidos están listos para recoger!`}</p>
          <button type="button" onClick={stopAlert} className="min-h-12 rounded-full bg-action px-6 py-2 font-semibold text-white">Detener alerta</button>
        </div>
      )}
      {permission === "default" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">Activa las notificaciones para avisarte con sonido y alerta del sistema cuando tu pedido esté listo.</p>
          <button type="button" onClick={() => void enableNotifications()} className="min-h-12 shrink-0 rounded-full border border-action px-5 py-2 text-sm font-semibold text-action">Activar notificaciones</button>
        </div>
      )}
      {permission === "denied" && <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">Las notificaciones están bloqueadas en tu navegador. Habilítalas en los permisos del sitio para recibir avisos del sistema.</p>}
      {active.map((order) => {
        const symbol = currencySymbols[order.currency] ?? "$";
        const percent = progress(order);
        return (
          <article key={order.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-action">{order.businessName}</p>
                <h2 className="text-lg font-bold text-dark">{labels[order.status] ?? order.status}</h2>
                <p className="text-sm text-slate-600">Pedido #{order.orderNumber || order.id.slice(0, 8)}</p>
              </div>
              <p className="font-bold">{symbol}{order.total.toFixed(2)}</p>
            </div>

            {order.status === "delivered" && order.fulfillmentType === "delivery" && (
              <div className="mt-4 rounded-xl border border-border bg-slate-50 p-4">
                <p className="font-semibold text-dark">Nuestro repartidor entregó tu pedido a: {order.deliveredToName}</p>
                {order.deliveryConfirmation === "disputed" && (
                  <p className="mt-1 text-sm text-slate-600">Avisamos al negocio que no recibiste tu pedido. Se pondrán en contacto contigo.</p>
                )}
                {order.deliveryConfirmation === "disputed" && (
                  <div className="mt-3">
                    <p className="mb-2 text-sm font-medium text-dark">Mensajes con el negocio</p>
                    <OrderChat endpoint="/api/customer/orders/messages" orderId={order.id} self="customer" />
                  </div>
                )}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button type="button" disabled={busyId === order.id} onClick={() => void respond(order.id, true)} className="flex-1 rounded-full bg-action px-4 py-2.5 font-medium text-white disabled:opacity-60">
                    Confirmo de recibido
                  </button>
                  {order.deliveryConfirmation === "pending" && (
                    <button type="button" disabled={busyId === order.id} onClick={() => void respond(order.id, false)} className="flex-1 rounded-full border border-border bg-white px-4 py-2.5 font-medium text-dark disabled:opacity-60">
                      No me entregaron
                    </button>
                  )}
                </div>
                {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
            )}

            {order.status !== "pending_payment" && order.status !== "delivered" && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-action transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
            )}

            <ul className="mt-3 text-sm text-slate-700">
              {order.items.map((item, index) => <li key={`${item.name}-${index}`}>{item.quantity}x {item.name}</li>)}
            </ul>
            {order.fulfillmentType === "delivery" && order.deliveryAddress && <p className="mt-2 text-sm text-slate-600">Entrega en: {order.deliveryAddress}</p>}
            {order.fulfillmentType === "pickup" && order.status === "ready_pickup" && (
              <div className="mt-4">
                <div role="status" className="animate-pulse rounded-2xl border-4 border-action bg-white p-6 text-center">
                  <p className="text-3xl font-extrabold uppercase tracking-wide text-action sm:text-4xl">¡Listo para recoger!</p>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  Tu pedido quedó listo a las {order.readyAt ? new Date(order.readyAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"}. Recoge lo más pronto posible tu pedido para que tus alimentos conserven la calidad y frescura.
                </p>
              </div>
            )}
            {order.fulfillmentType === "pickup" && order.status !== "delivered" && (
              <div className="mt-3 rounded-xl border border-border bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-dark">Recoger en tienda</p>
                <p className="text-slate-600">Muestra este número de pedido al recoger:</p>
                <p className="mt-1 text-2xl font-bold tracking-wide text-dark">{order.orderNumber || order.id.slice(0, 8)}</p>
              </div>
            )}

            {order.status === "ready_delivery" && (
              <div className="mt-4">
                {order.driver ? (
                  <>
                    <TrackingMap driver={order.driver} destination={order.destination} />
                    <p className="mt-2 text-xs text-slate-500">
                      {order.driver.live ? "Ubicación en tiempo real" : "Última ubicación conocida"} · {new Date(order.driver.updatedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Tu repartidor ya tiene tu pedido. En cuanto active su ubicación la verás aquí.</p>
                )}
              </div>
            )}

            {order.restaurantId && <Link href={`/store/${order.restaurantId}`} className="mt-3 inline-block text-sm font-medium text-action">Ver negocio</Link>}
          </article>
        );
      })}
    </section>
  );
}
