import { cookies }
  from "next/headers";

import { redirect }
  from "next/navigation";

import { SaaSService }
  from "@/src/modules/saas/saas.service";

export default async function DashboardPage() {

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

  return (
    <div className="p-6">

      <h1
        className="mb-6 text-3xl font-bold"
      >
        Dashboard SaaS
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

        <div className="rounded border p-4">
          <p>Total Negocios</p>
          <h2 className="text-3xl font-bold">
            {metrics.totalBusinesses}
          </h2>
        </div>

        <div className="rounded border p-4">
          <p>Trial</p>
          <h2 className="text-3xl font-bold">
            {metrics.trialBusinesses}
          </h2>
        </div>

        <div className="rounded border p-4">
          <p>Activos</p>
          <h2 className="text-3xl font-bold">
            {metrics.activeBusinesses}
          </h2>
        </div>

        <div className="rounded border p-4">
          <p>Suspendidos</p>
          <h2 className="text-3xl font-bold">
            {metrics.suspendedBusinesses}
          </h2>
        </div>

        <div className="rounded border p-4">
          <p>Planes</p>
          <h2 className="text-3xl font-bold">
            {metrics.totalPlans}
          </h2>
        </div>

      </div>

    </div>
  );
}