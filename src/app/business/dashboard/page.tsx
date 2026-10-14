import { redirect } from "next/navigation";

import SubscriptionNotice from "@/src/components/billing/subscription-notice";
import SalesDashboard from "@/src/components/dashboard/sales-dashboard";
import { getCurrentUser } from "@/src/lib/current-user";
import { prisma } from "@/src/lib/prisma";
import { getBillingOverview } from "@/src/modules/billing/subscription.service";

export const dynamic = "force-dynamic";

export default async function BusinessDashboardPage() {
  const user = await getCurrentUser();

  if (!user?.tenantId) {
    redirect("/login");
  }

  const [tenant, overview] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: user.tenantId } }),
    getBillingOverview(user.tenantId)
  ]);

  if (!tenant) {
    redirect("/login");
  }

  return (
    <div>
      {overview?.notice && <SubscriptionNotice notice={overview.notice} />}

      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-3xl font-bold text-[#2B2118]">Resumen</h1>
        <p className="text-sm text-slate-500">
          Estado: {tenant.status} · Código de referido: {tenant.referralCode}
        </p>
      </div>

      <SalesDashboard />
    </div>
  );
}
