import Link from "next/link";

import { cookies }
  from "next/headers";

import { redirect }
  from "next/navigation";

import UsageCharts from "@/src/components/dashboard/usage-charts";

import RevenueSection from "@/src/components/dashboard/revenue-section";

import PlatformHealthSection from "@/src/components/dashboard/platform-health";

import { getUsageStats, type Audience }
  from "@/src/modules/saas/usage-stats";

import { currentMonth, defaultFromMonth, getRevenueStats, parseMonth }
  from "@/src/modules/saas/revenue-stats";

import { getPlatformHealth }
  from "@/src/modules/saas/platform-health";

import { SaaSService }
  from "@/src/modules/saas/saas.service";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ audience?: string; from?: string; to?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {

  const params =
    await searchParams;

  const audience: Audience =
    params.audience === "businesses" ? "businesses" : "users";

  const to =
    parseMonth(params.to, currentMonth());

  const from =
    parseMonth(params.from, defaultFromMonth());


  const cookieStore =
    await cookies();

  const user =
    cookieStore.get(
      "saas_user"
    );

  if (!user) {

    redirect("/login");
  }

  const saasService =
    new SaaSService();

  const metrics =
    await saasService
      .getDashboardMetrics();

  const [usage, revenue, health] =
    await Promise.all([
      getUsageStats(audience),
      getRevenueStats(from, to),
      getPlatformHealth()
    ]);

  return (
    <div className="p-6">

      <h1
        className="mb-6 text-3xl font-bold"
      >
        Dashboard SaaS
      </h1>

      <div className="mb-6 inline-flex rounded-full border bg-white p-1" role="tablist" aria-label="Filtro de datos">
        {([["users", "Usuarios"], ["businesses", "Negocios"]] as const).map(([value, label]) => (
          <Link
            key={value}
            href={`/saas/dashboard?audience=${value}&from=${revenue.from}&to=${revenue.to}`}
            role="tab"
            aria-selected={audience === value}
            className={`rounded-full px-5 py-2 text-sm font-medium ${audience === value ? "bg-action text-white" : "text-slate-600"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="space-y-8">
        <UsageCharts stats={usage} />

        <RevenueSection stats={revenue} audience={audience} />

        <PlatformHealthSection health={health} />
      </div>

    </div>
  );
}