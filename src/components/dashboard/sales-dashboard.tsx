"use client";

import { useEffect, useMemo, useState } from "react";

import OrdersHistory from "@/src/components/dashboard/orders-history";
import type {
  MonthlyTrend,
  ProductSales,
  SalesDashboardData,
  SalesPeriod,
  WeekdayPattern
} from "@/src/modules/analytics/sales-analytics.types";

const COLORS = { total: "#2B2118", online: "#D95D39", local: "#F4B942" };

const periodOptions: Array<{ value: SalesPeriod; label: string }> = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" }
];

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = reduceMotion ? 1 : Math.min((now - start) / duration, 1);
      setValue(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function CountUp({ value, format }: { value: number; format: (value: number) => string }) {
  return <>{format(useCountUp(value))}</>;
}

function makeMoney(currency: string) {
  const formatter = new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 });
  return (value: number) => formatter.format(value);
}

const integer = (value: number) => Math.round(value).toLocaleString("es-MX");

export default function SalesDashboard() {
  const [period, setPeriod] = useState<SalesPeriod>("week");
  // null = today, resolved by the server in the business timezone
  const [date, setDate] = useState<string | null>(null);
  const [data, setData] = useState<SalesDashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/business/dashboard?period=${period}${date ? `&date=${date}` : ""}`, { signal: controller.signal });
        const body: SalesDashboardData & { error?: string } = await response.json();
        if (!response.ok) {
          setError(body.error || "No se pudo cargar el resumen");
          return;
        }
        setError("");
        setData(body);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setError("No se pudo conectar con el servidor");
      }
    }

    load();
    return () => controller.abort();
  }, [period, date]);

  const loading = !data || data.period !== period || (date === null ? data.anchor !== data.today : data.anchor !== date);
  const money = useMemo(() => makeMoney(data?.currency || "MXN"), [data?.currency]);

  return (
    <div className="space-y-6">
      <Filters period={period} date={date ?? data?.anchor ?? ""} today={data?.today} onPeriod={setPeriod} onDate={setDate} />

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

      {!data ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200" aria-busy="true" />
      ) : (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`} aria-busy={loading}>
          <Card title="Avance de ventas" subtitle={data.rangeLabel}>
            <BarChart data={data} money={money} />
          </Card>

          <section className="rounded-2xl border border-[#F4B942]/50 bg-[#F4B942]/10 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#D95D39]">Análisis de ventas</h2>
            <p className="mt-2 text-lg font-semibold text-[#2B2118]">{data.insight.summary}</p>
            {data.insight.peak && <p className="mt-1 text-[#2B2118]/80">{data.insight.peak}</p>}
          </section>

          <Card title="Demanda por día y horario" subtitle="El sistema aprende de tu historial para marcar tus horarios fuertes">
            <Heatmap weekdays={data.patterns.weekdays} money={money} />
            <ul className="mt-4 space-y-1 text-sm text-[#2B2118]/80">
              {data.patterns.insights.map((text) => <li key={text}>• {text}</li>)}
            </ul>
            <h3 className="mb-2 mt-6 text-sm font-semibold text-[#2B2118]">Tendencia anual (últimos 12 meses)</h3>
            <MonthlyBars months={data.patterns.monthly} money={money} />
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={data.period === "day" ? "Ganancia del día" : "Ganancia del periodo"} accent>
              <p className="text-3xl font-bold"><CountUp value={data.totals.revenue} format={money} /></p>
              {data.period !== "day" && <p className="mt-1 text-sm text-slate-500">Promedio diario: {money(data.totals.averageDaily)}</p>}
            </StatCard>
            <StatCard label="Productos vendidos">
              <p className="text-3xl font-bold"><CountUp value={data.totals.units} format={integer} /></p>
              <p className="mt-1 text-sm text-slate-500">{data.totals.orders} pedidos</p>
            </StatCard>
            <StatCard label="Top 3 más vendidos">
              <ProductList products={data.topProducts} empty="Sin ventas en el periodo" />
            </StatCard>
            <StatCard label="Top 2 menor venta">
              <ProductList products={data.lowProducts} empty="Sin productos activos" />
            </StatCard>
          </div>

          <History data={data} money={money} />
        </div>
      )}
    </div>
  );
}

function Filters({ period, date, today, onPeriod, onDate }: { period: SalesPeriod; date: string; today?: string; onPeriod: (value: SalesPeriod) => void; onDate: (value: string | null) => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200" role="group" aria-label="Periodo">
        {periodOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPeriod(option.value)}
            aria-pressed={period === option.value}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${period === option.value ? "bg-[#D95D39] text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
        {period === "day" ? "Día" : period === "week" ? "Semana que incluye" : "Mes que incluye"}
        <input
          type="date"
          value={date}
          max={today}
          onChange={(event) => onDate(event.target.value && event.target.value !== today ? event.target.value : null)}
          className="rounded-lg border bg-white px-3 py-2"
        />
      </label>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-semibold text-[#2B2118]">{title}</h2>
      {subtitle && <p className="mb-4 text-sm text-slate-500">{subtitle}</p>}
      {children}
    </section>
  );
}

function StatCard({ label, accent, children }: { label: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${accent ? "border-[#D95D39]/30 bg-[#D95D39]/5" : "bg-white"}`}>
      <p className="mb-2 text-sm font-medium text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function ProductList({ products, empty }: { products: ProductSales[]; empty: string }) {
  if (products.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ol className="space-y-2">
      {products.map((product, index) => (
        <li key={product.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate font-medium">{index + 1}. {product.name}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-semibold"><CountUp value={product.units} format={integer} /> uds</span>
        </li>
      ))}
    </ol>
  );
}

function BarChart({ data, money }: { data: SalesDashboardData; money: (value: number) => string }) {
  const max = Math.max(...data.buckets.map((bucket) => bucket.total), 1);
  const wide = data.buckets.length > 7;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs">
        {([["total", "Venta total"], ["online", "Venta online"], ["local", "Venta local"]] as const).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: COLORS[key] }} />{label}</span>
        ))}
        <span className="ml-auto text-slate-500">Máx. {money(max === 1 && data.totals.revenue === 0 ? 0 : max)}</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className={`flex h-56 items-end gap-1 border-b ${wide ? "min-w-[640px]" : ""}`}>
          {data.buckets.map((bucket) => (
            <div key={bucket.key} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${bucket.label} · Total ${money(bucket.total)} · Online ${money(bucket.online)} · Local ${money(bucket.local)}`}>
              <div className="flex flex-1 items-end justify-center gap-px">
                {(["total", "online", "local"] as const).map((key) => (
                  <div
                    key={key}
                    className="w-full max-w-4 rounded-t-sm transition-[height] duration-700"
                    style={{ height: `${(bucket[key] / max) * 100}%`, minHeight: bucket[key] > 0 ? 2 : 0, background: COLORS[key] }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={`flex gap-1 pt-1 ${wide ? "min-w-[640px]" : ""}`}>
          {data.buckets.map((bucket, index) => (
            <span key={bucket.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-500">
              {data.chartUnit === "hour" && index % 2 === 1 ? "" : bucket.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Heatmap({ weekdays, money }: { weekdays: WeekdayPattern[]; money: (value: number) => string }) {
  const max = Math.max(...weekdays.flatMap((day) => day.hours), 0);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-1 ml-20 grid gap-px text-[10px] text-slate-500" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
          {Array.from({ length: 24 }, (_, hour) => <span key={hour} className="text-center">{hour % 3 === 0 ? hour : ""}</span>)}
        </div>
        {weekdays.map((day) => (
          <div key={day.weekday} className="mb-px flex items-center gap-2">
            <span className="w-[72px] shrink-0 text-xs font-medium text-slate-600">{day.label}</span>
            <div className="grid flex-1 gap-px" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
              {day.hours.map((value, hour) => (
                <div
                  key={hour}
                  className="h-6 rounded-sm bg-slate-100"
                  style={max > 0 && value > 0 ? { background: `rgba(217, 93, 57, ${0.15 + 0.85 * (value / max)})` } : undefined}
                  title={`${day.label} ${hour}:00 · promedio ${money(value)}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Más oscuro = mayor venta promedio por hora (horas 0 a 23).</p>
    </div>
  );
}

function MonthlyBars({ months, money }: { months: MonthlyTrend[]; money: (value: number) => string }) {
  const max = Math.max(...months.map((month) => month.revenue), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex h-36 min-w-[480px] items-end gap-2 border-b">
        {months.map((month) => (
          <div key={month.key} className="flex h-full flex-1 flex-col justify-end" title={`${month.label} · ${money(month.revenue)}`}>
            <div className="w-full rounded-t-sm bg-[#F4B942] transition-[height] duration-700" style={{ height: `${(month.revenue / max) * 100}%`, minHeight: month.revenue > 0 ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="flex min-w-[480px] gap-2 pt-1">
        {months.map((month) => <span key={month.key} className="flex-1 truncate text-center text-[10px] text-slate-500">{month.label.split(" ")[0]}</span>)}
      </div>
    </div>
  );
}

function History({ data, money }: { data: SalesDashboardData; money: (value: number) => string }) {
  const { history } = data;

  return (
    <Card title="Resumen histórico" subtitle={history.firstDate ? `Ventas acumuladas desde el ${history.firstDate}` : "Aún no hay ventas históricas"}>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Ventas totales", money(history.revenue)],
          ["Venta online", money(history.online)],
          ["Venta local", money(history.local)],
          ["Pedidos", integer(history.orders)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>

      {history.months.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2 font-medium">Mes</th>
                <th className="py-2 text-right font-medium">Pedidos</th>
                <th className="py-2 text-right font-medium">Online</th>
                <th className="py-2 text-right font-medium">Local</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {history.months.map((month) => (
                <tr key={month.key} className="border-b last:border-0">
                  <td className="py-2">{month.label}</td>
                  <td className="py-2 text-right">{integer(month.orders)}</td>
                  <td className="py-2 text-right">{money(month.online)}</td>
                  <td className="py-2 text-right">{money(month.local)}</td>
                  <td className="py-2 text-right font-semibold">{money(month.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrdersHistory />
    </Card>
  );
}
