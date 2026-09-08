import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedPrismaClient = PrismaClient & {
  businessTestimonial?: {
    findFirst: () => Promise<unknown>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

const seedPrisma = prisma as unknown as SeedPrismaClient;

async function main() {

  console.log("Starting seed...");

  const existingSettings =
    await prisma.saaSSettings.findFirst();

  if (!existingSettings) {

    await prisma.saaSSettings.create({

      data: {

        trialEnabled: true,

        trialDays: 15,

        referralEnabled: true,

        referralRewardPercent: 5,

        referredRewardPercent: 15,

        maxMonthlyReferralDiscount: 50
      }
    });

    console.log("SaaS Settings created");
  }

  const testimonial =
    await seedPrisma.businessTestimonial?.findFirst?.();

  if (!testimonial) {

  await seedPrisma.businessTestimonial?.create?.({

    data: {

      businessName:
        "Quesadillas Lupita",

      city:
        "Ciudad de México",

      rating: 5,

      testimonial:
        "Muy buena app, ayudó a mi negocio a organizar pedidos y aumentar ventas.",

      approved: true,

      active: true
    }
  });

  console.log(
    "Business testimonial created"
  );
}

  const basicPlan =
    await prisma.subscriptionPlan.findFirst({
      where: { name: "BASICO" }
    });

  if (!basicPlan) {

    await prisma.subscriptionPlan.create({

      data: {

        name: "BASICO",

        description:
          "Plan default para restaurantes",

        price: 299,

        active: true
      }
    });

    console.log("Basic plan created");
  }

  const premiumPlan =
    await prisma.subscriptionPlan.findFirst({
      where: { name: "PREMIUM" }
    });

  if (!premiumPlan) {

    await prisma.subscriptionPlan.create({

      data: {

        name: "PREMIUM",

        description:
          "Plan premium",

        price: 499,

        active: true
      }
    });

    console.log("Premium plan created");
  }

  const existingPromo =
  await prisma.saaSPromotion.findFirst({
    where: {
      code: "HOTSALE"
    }
  });

if (!existingPromo) {

  await prisma.saaSPromotion.create({

    data: {

      name: "Hot Sale",

      code: "HOTSALE",

      type: "percentage",

      value: 15,

      active: true,

      startsAt: new Date(),

      endsAt: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      )
    }
  });
}

  const adminEmail =
    process.env.SUPER_ADMIN_EMAIL!;

  const adminPassword =
    process.env.SUPER_ADMIN_PASSWORD!;

  const existingAdmin =
    await prisma.user.findUnique({
      where: {
        email: adminEmail
      }
    });

  if (!existingAdmin) {

    const passwordHash =
      await bcrypt.hash(adminPassword, 12);

    await prisma.user.create({

      data: {

        email: adminEmail,

        passwordHash,

        role: "super_admin"
      }
    });

    console.log("Super Admin created");
  }

  console.log("Seed finished");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });