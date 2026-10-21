"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import TrackingMap from "@/src/components/tracking/tracking-map";
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
  const active = useMemo(() => orders.filter((order) => order.status !== "delivered" || order.deliveryConfirmation === "pending" || order.deliveryConfirmation === "disputed"), [orders]);
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
