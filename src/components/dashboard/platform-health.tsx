import type { HealthLevel, PlatformHealth } from "@/src/modules/saas/platform-health";

const styles: Record<HealthLevel, { text: string; bar: string; badge: string; label: string }> = {
  ok: { text: "text-green-700", bar: "bg-green-500", badge: "bg-green-100 text-green-800", label: "Estable" },
  warning: { text: "text-amber-700", bar: "bg-amber-500", badge: "bg-amber-100 text-amber-800", label: "Atención" },
  critical: { text: "text-red-700", bar: "bg-red-600", badge: "bg-red-100 text-red-800 animate-pulse", label: "Crítico" }
};

export default function PlatformHealthSection({ health }: { health: PlatformHealth }) {
  const overall = styles[health.level];

  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-dark">Estado de la plataforma</h2>
          <p className="text-sm text-slate-500">Revisado a las {new Date(health.checkedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}. Recarga la página para actualizar.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${overall.badge}`}>{overall.label}</span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {health.metrics.map((metric) => {
          const style = styles[metric.level];
          return (
            <div key={metric.key} className="rounded-xl border p-4">
              <p className="text-sm text-slate-600">{metric.label}</p>
              <p className={`mt-1 text-2xl font-bold ${style.text}`}>{metric.value}</p>
              <p className="text-xs text-slate-500">{metric.detail}</p>
              {metric.percent !== null && (
                <div className="mt-2 h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(metric.percent)} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(100, metric.percent)}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
