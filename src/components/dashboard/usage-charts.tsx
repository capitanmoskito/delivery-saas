import type { RankedItem, UsageStats } from "@/src/modules/saas/usage-stats";

const numberFormat = new Intl.NumberFormat("es-MX");

function formatDay(date: string) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-dark">{numberFormat.format(value)}</p>
    </div>
  );
}

function RankingList({ title, items }: { title: string; items: RankedItem[] }) {
  const max = items[0]?.count ?? 0;
  return (
    <section className="rounded-xl border bg-white p-5">
      <h3 className="mb-3 font-semibold text-dark">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Sin datos todavía.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li key={item.name} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate">{index + 1}. {item.name}</span>
                <span className="font-medium">{numberFormat.format(item.count)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-action" style={{ width: `${max ? (item.count / max) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function UsageCharts({ stats }: { stats: UsageStats }) {
  const maxDaily = Math.max(1, ...stats.dailyActive.map((day) => day.count));
  const { gender } = stats;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold text-dark">{stats.audience === "businesses" ? "Administradores de negocio activos por día" : "Usuarios activos por día"}</h2>
        <p className="mb-4 text-sm text-slate-500">Últimos 30 días</p>
        <div className="overflow-x-auto">
          <div className="flex h-56 min-w-176 items-end gap-1" role="img" aria-label="Gráfica de barras de usuarios activos por día">
            {stats.dailyActive.map((day) => (
              <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${formatDay(day.date)}: ${day.count}`}>
                <span className="text-[10px] text-slate-600">{day.count}</span>
                <div className="w-full rounded-t bg-action" style={{ height: `${(day.count / maxDaily) * 80}%`, minHeight: day.count ? 2 : 0 }} />
                <span className="text-[9px] text-slate-500">{formatDay(day.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={`grid gap-4 ${stats.audience === "businesses" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <StatBlock label={stats.audience === "businesses" ? "Negocios registrados (administradores)" : "Usuarios registrados"} value={stats.registeredUsers} />
        <StatBlock label="Usuarios activos (últimos 30 días)" value={stats.activeUsers} />
        {stats.audience === "businesses" && <StatBlock label="Pruebas activas" value={stats.activeTrials} />}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Datos demográficos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <RankingList title="Top 20 países" items={stats.countries} />
          <RankingList title="Top 20 ciudades" items={stats.cities} />
          <RankingList title="Top 20 municipios / alcaldías" items={stats.municipalities} />
        </div>
      </div>

      <section className="rounded-xl border bg-white p-5">
        <h3 className="mb-4 font-semibold text-dark">Género</h3>
        <div className="space-y-3">
          {([["Hombres", gender.malePercent, gender.male], ["Mujeres", gender.femalePercent, gender.female]] as const).map(([label, percent, count]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="font-medium">{percent}% ({numberFormat.format(count)})</span></div>
              <div className="h-6 rounded bg-slate-100"><div className="h-full rounded bg-action" style={{ width: `${percent}%` }} /></div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Porcentaje sobre usuarios que indicaron su género. Sin dato: {numberFormat.format(gender.unspecified)}.</p>
      </section>
    </div>
  );
}
