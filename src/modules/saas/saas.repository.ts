import { prisma } from "@/src/lib/prisma";

export class SaaSRepository {

  async getMetrics() {

    const totalBusinesses =
      await prisma.tenant.count();

    const trialBusinesses =
      await prisma.tenant.count({
        where: {
          status: "trial"
        }
      });

    const activeBusinesses =
      await prisma.tenant.count({
        where: {
          status: "active"
        }
      });

    const suspendedBusinesses =
      await prisma.tenant.count({
        where: {
          status: "suspended"
        }
      });

    const totalPlans =
      await prisma.subscriptionPlan.count();

    return {
      totalBusinesses,
      trialBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      totalPlans
    };
  }
}