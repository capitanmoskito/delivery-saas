"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

import { addDays, weekRange } from "@/src/lib/business-time";
import type { OrdersHistoryData } from "@/src/modules/analytics/orders-history.service";
import type { SalesPeriod } from "@/src/modules/analytics/sales-analytics.types";

type HistoryResponse = OrdersHistoryData & { today: string };

const periodOptions: Array<{ value: SalesPeriod; label: string }> = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const fulfillmentLabels: Record<string, string> = { delivery: "Envío", pickup: "Recoger", dine_in: "En local" };

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatKey(key: string) {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

function rangeLabel(data: OrdersHistoryData) {
  return data.from === data.to ? formatKey(data.from) : `${formatKey(data.from)} al ${formatKey(data.to)}`;
}

function buildWeekOptions(today: string) {
  const options: Array<{ from: string; label: string }> = [];
  let from = weekRange(today).from;
  for (let index = 0; index < 52; index += 1) {
    const to = weekRange(from).to;
    options.push({ from, label: `${formatKey(from).slice(0, 5)} – ${formatKey(to).slice(0, 5)}${index === 0 ? " (actual)" : ""}` });
    from = addDays(from, -7);
  }
  return options.map((option) => ({ ...option, to: addDays(option.from, 6) }));
}

function buildMonthOptions(today: string) {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { value, label: date.toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" }) };
  });
}

function buildPrintHtml(data: OrdersHistoryData, money: (value: number) => string) {
  const dayRows = data.days.map((day) => `<tr><td>${formatKey(day.date)}</td><td class="n">${day.made}</td><td class="n">${day.received}</td><td class="n">${money(day.revenue)}</td></tr>`).join("");
  const orderRows = data.orders.map((order) => `<tr><td>${escapeHtml(order.orderNumber)}</td><td>${formatTime(order.createdAt)}</td><td>${order.source === "online" ? "En línea" : "En local"} · ${fulfillmentLabels[order.fulfillmentType] ?? escapeHtml(order.fulfillmentType)}</td><td>${order.received ? "Recibido" : "Pendiente"}</td><td class="n">${money(order.total)}</td></tr>`).join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Resumen de pedidos ${escapeHtml(rangeLabel(data))}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#2B2118;margin:24px;font-size:12px}
h1{font-size:20px;margin:0}h2{font-size:14px;margin:20px 0 6px;color:#D95D39}
.meta{color:#64748b;margin:4px 0 16px}
.kpis{display:flex;gap:12px}.kpi{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:8px}.kpi b{display:block;font-size:16px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #e2e8f0}
th{background:#f8fafc}.n{text-align:right}tr{page-break-inside:avoid}
@page{margin:14mm}
</style></head><body>
<h1>${escapeHtml(data.businessName || "Resumen de pedidos")}</h1>
<p class="meta">Resumen de pedidos · ${escapeHtml(rangeLabel(data))} · Generado el ${new Date().toLocaleString("es-MX")}</p>
<div class="kpis">
<div class="kpi">Pedidos hechos<b>${data.totals.made}</b></div>
<div class="kpi">Pedidos recibidos<b>${data.totals.received}</b></div>
<div class="kpi">Pendientes<b>${data.totals.pending}</b></div>
<div class="kpi">Ventas<b>${money(data.totals.revenue)}</b></div>
</div>
${data.period !== "day" ? `<h2>Por día</h2><table><thead><tr><th>Día</th><th class="n">Hechos</th><th class="n">Recibidos</th><th class="n">Ventas</th></tr></thead><tbody>${dayRows}</tbody><tfoot><tr><th>Total</th><th class="n">${data.totals.made}</th><th class="n">${data.totals.received}</th><th class="n">${money(data.totals.revenue)}</th></tr></tfoot></table>` : ""}
<h2>Pedidos</h2>
<table><thead><tr><th>Número</th><th>Fecha</th><th>Tipo</th><th>Estatus</th><th class="n">Monto</th></tr></thead><tbody>${orderRows || '<tr><td colspan="5">Sin pedidos en el periodo</td></tr>'}</tbody><tfoot><tr><th colspan="3">Total (${data.totals.made} pedidos)</th><th>${data.totals.received} recibidos</th><th class="n">${money(data.totals.revenue)}</th></tr></tfoot></table>
${data.truncated ? "<p>Se muestran los primeros 1000 pedidos del periodo.</p>" : ""}
</body></html>`;
}

export default function OrdersHistory() {
  const [period, setPeriod] = useState<SalesPeriod>("day");
  const [date, setDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/business/orders-history?period=${period}${date ? `&date=${date}` : ""}${period === "week" && endDate ? `&to=${endDate}` : ""}`, { signal: controller.signal })
      .then(async (response) => {
        const body: HistoryResponse & { error?: string } = await response.json();
        if (!response.ok) throw new Error(body.error || "No se pudo cargar el historial de pedidos");
        setData(body);
        setError("");
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial de pedidos");
      });
    return () => controller.abort();
  }, [period, date, endDate]);

  const money = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: data?.currency || "MXN" }).format(value);
  const anchor = date ?? data?.today ?? "";
  const loading = !data || data.period !== period || anchor < data.from || anchor > data.to;
  const today = data?.today ?? "";
  const weekOptions = today ? buildWeekOptions(today) : [];
  const monthOptions = today ? buildMonthOptions(today) : [];
  const weekFrom = weekOptions.find((week) => week.from <= anchor && anchor <= week.to)?.from ?? "";
  const endAnchor = endDate ?? anchor;
  const weekTo = weekOptions.find((week) => week.from <= endAnchor && endAnchor <= week.to)?.from ?? weekFrom;
  const monthValue = anchor.slice(0, 7);

  function changePeriod(next: SalesPeriod) {
    setPeriod(next);
    setEndDate(null);
  }

  function pickDate(value: string | null) {
    setDate(value && value !== today ? value : null);
    setEndDate(null);
  }

  function printSummary() {
    if (!data) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Permite las ventanas emergentes para generar el PDF.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildPrintHtml(data, money));
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
    // Fallback when onload already fired for the written document.
    window.setTimeout(() => { if (!printWindow.closed) printWindow.print(); }, 500);
  }

  return (
    <div className="mt-6 border-t pt-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-base font-semibold text-[#2B2118]">Pedidos hechos y recibidos</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200" role="group" aria-label="Periodo del historial">
            {periodOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => changePeriod(option.value)} aria-pressed={period === option.value} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${period === option.value ? "bg-[#D95D39] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {option.label}
              </button>
            ))}
          </div>
          {period === "day" && (
            <input type="date" aria-label="Día del historial" value={anchor} max={today} onChange={(event) => pickDate(event.target.value || null)} className="rounded-lg border bg-white px-3 py-2 text-sm" />
          )}
          {period === "week" && (
            <div className="flex items-center gap-2">
              <select aria-label="Semana inicial" value={weekFrom} onChange={(event) => { const from = event.target.value; setDate(from); if (weekTo < from) setEndDate(null); }} className="rounded-lg border bg-white px-2 py-2 text-sm">
                {weekOptions.map((week) => <option key={week.from} value={week.from}>{week.label}</option>)}
              </select>
              <span className="text-xs text-slate-500">a</span>
              <select aria-label="Semana final" value={weekTo} onChange={(event) => setEndDate(event.target.value)} className="rounded-lg border bg-white px-2 py-2 text-sm">
                {weekOptions.filter((week) => week.from >= weekFrom).map((week) => <option key={week.from} value={week.from}>{week.label}</option>)}
              </select>
            </div>
          )}
          {period === "month" && (
            <select aria-label="Mes del historial" value={monthOptions.some((month) => month.value === monthValue) ? monthValue : ""} onChange={(event) => pickDate(event.target.value ? `${event.target.value}-01` : null)} className="rounded-lg border bg-white px-3 py-2 text-sm capitalize">
              {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          )}
          <button type="button" disabled={!data || loading} onClick={printSummary} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2B2118] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            <Printer size={16} /> Imprimir PDF
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {data && (
        <div className={`mt-4 transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
          <p className="mb-3 text-sm text-slate-500">{rangeLabel(data)}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Pedidos hechos", String(data.totals.made)],
              ["Pedidos recibidos", String(data.totals.received)],
              ["Pendientes", String(data.totals.pending)],
              ["Ventas", money(data.totals.revenue)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-120 text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 font-medium">{data.period === "day" ? "Pedido" : "Día"}</th>
                  <th className="py-2 text-right font-medium">{data.period === "day" ? "Tipo" : "Hechos"}</th>
                  <th className="py-2 text-right font-medium">{data.period === "day" ? "Estatus" : "Recibidos"}</th>
                  <th className="py-2 text-right font-medium">{data.period === "day" ? "Monto" : "Ventas"}</th>
                </tr>
              </thead>
              <tbody>
                {data.period === "day"
                  ? data.orders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0">
                        <td className="py-2">{order.orderNumber}</td>
                        <td className="py-2 text-right">{order.source === "online" ? "En línea" : "En local"} · {fulfillmentLabels[order.fulfillmentType] ?? order.fulfillmentType}</td>
                        <td className="py-2 text-right">{order.received ? "Recibido" : "Pendiente"}</td>
                        <td className="py-2 text-right font-semibold">{money(order.total)}</td>
                      </tr>
                    ))
                  : data.days.map((day) => (
                      <tr key={day.date} className="border-b last:border-0">
                        <td className="py-2">{formatKey(day.date)}</td>
                        <td className="py-2 text-right">{day.made}</td>
                        <td className="py-2 text-right">{day.received}</td>
                        <td className="py-2 text-right font-semibold">{money(day.revenue)}</td>
                      </tr>
                    ))}
                {data.period === "day" && data.orders.length === 0 && <tr><td colSpan={4} className="py-3 text-slate-500">Sin pedidos en el día seleccionado</td></tr>}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold">
                  {data.period === "day" ? (
                    <>
                      <td className="py-2">Total ({data.totals.made} pedidos)</td>
                      <td className="py-2 text-right">{data.totals.pending} pendientes</td>
                      <td className="py-2 text-right">{data.totals.received} recibidos</td>
                    </>
                  ) : (
                    <>
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right">{data.totals.made}</td>
                      <td className="py-2 text-right">{data.totals.received}</td>
                    </>
                  )}
                  <td className="py-2 text-right">{money(data.totals.revenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
