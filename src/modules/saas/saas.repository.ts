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

    const totalPromotions =
      await prisma.saaSPromotion.count();

    const testimonialModel = (
      prisma as typeof prisma & {
        businessTestimonial?: {
          count: (args?: unknown) => Promise<number>;
        };
      }
    ).businessTestimonial;

    const totalTestimonials =
      testimonialModel
        ? await testimonialModel.count()
        : 0;

    return {
      totalBusinesses,
      trialBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      totalPlans,
      totalPromotions,
      totalTestimonials,
    };
  }
}