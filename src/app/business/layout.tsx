import Link
from "next/link";

import BusinessMenu
from "@/src/components/business-menu";
import BusinessOnboardingBanner from "@/src/components/business-onboarding-banner";

import { getCurrentUser }
from "@/src/lib/current-user";

import { prisma }
from "@/src/lib/prisma";
import { getTenantOnboardingProgress } from "@/src/modules/tenants/tenant-onboarding";

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const [tenant, onboardingProgress] = user?.tenantId
    ? await Promise.all([
        prisma.tenant.findUnique({
          where: { id: user.tenantId },
          select: { businessName: true, status: true, trialEndsAt: true },
        }),
        getTenantOnboardingProgress(user.tenantId),
      ])
    : [null, null];

  let tenantStatus = tenant?.status ?? "";
  const now = new Date();
  if (
    tenant &&
    onboardingProgress &&
    !onboardingProgress.complete &&
    tenant.status === "trial" &&
    tenant.trialEndsAt &&
    tenant.trialEndsAt <= now
  ) {
    const suspended = await prisma.tenant.updateMany({
      where: { id: user?.tenantId, status: "trial", trialEndsAt: { lte: now } },
      data: { status: "suspended" },
    });
    if (suspended.count > 0) tenantStatus = "suspended";
  }

  return (
    <div className="min-h-screen bg-slate-50">

      <header className="border-b bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">

          <Link
            href="/business/dashboard"
            className="text-xl font-bold"
          >
            {tenant?.businessName || "Portal Negocio"}
          </Link>

          <BusinessMenu />
        </div>

      </header>

      {onboardingProgress && !onboardingProgress.complete && (
        <BusinessOnboardingBanner
          progress={onboardingProgress}
          trialEndsAt={tenant?.trialEndsAt ?? null}
          tenantStatus={tenantStatus}
        />
      )}

      <main className="mx-auto max-w-7xl p-6">
        {children}
      </main>

    </div>
  );
}