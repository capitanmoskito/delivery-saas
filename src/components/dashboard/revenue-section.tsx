import type { RevenueStats } from "@/src/modules/saas/revenue-stats";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
}

function monthLabel(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Date(year, number - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
}

export default function RevenueSection({ stats, audience }: { stats: RevenueStats; audience: string }) {
  const max = Math.max(1, ...stats.months.map((month) => month.amount));

  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-semibold text-dark">Ingresos por suscripciones</h2>
          <p className="text-sm text-slate-500">Pagos de suscripción confirmados por los negocios</p>
        </div>
        <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
          <input type="hidden" name="audience" value={audience} />
          <label className="block">Desde<input type="month" name="from" defaultValue={stats.from} className="mt-1 block rounded border p-2" /></label>
          <label className="block">Hasta<input type="month" name="to" defaultValue={stats.to} className="mt-1 block rounded border p-2" /></label>
          <button type="submit" className="rounded bg-action px-4 py-2 font-medium text-white">Filtrar</button>
        </form>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-slate-600">Ingresos del periodo</p>
          {stats.totals.length === 0 ? <p className="mt-1 text-3xl font-bold">{money(0, stats.currency)}</p> : stats.totals.map((total) => <p key={total.currency} className="mt-1 text-3xl font-bold text-dark">{money(total.amount, total.currency)}</p>)}
        </div>
        <div className="rounded-xl border p-4"><p className="text-sm text-slate-600">Pagos recibidos</p><p className="mt-1 text-3xl font-bold text-dark">{stats.paymentCount}</p></div>
        <div className="rounded-xl border p-4"><p className="text-sm text-slate-600">Negocios que pagaron</p><p className="mt-1 text-3xl font-bold text-dark">{stats.payingTenants}</p></div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="flex h-52 min-w-88 items-end gap-2" role="img" aria-label="Gráfica de ingresos por mes">
          {stats.months.map((month) => (
            <div key={month.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${monthLabel(month.month)}: ${money(month.amount, stats.currency)}`}>
              <span className="text-[10px] text-slate-600">{month.amount ? money(month.amount, stats.currency) : ""}</span>
              <div className="w-full rounded-t bg-secondary" style={{ height: `${(month.amount / max) * 75}%`, minHeight: month.amount ? 2 : 0 }} />
              <span className="text-[10px] text-slate-500">{monthLabel(month.month)}</span>
            </div>
          ))}
        </div>
      </div>
      {stats.totals.length > 1 && <p className="mt-2 text-xs text-slate-500">La gráfica muestra solo {stats.currency}; hay pagos en otras monedas en el total.</p>}
    </section>
  );
}
