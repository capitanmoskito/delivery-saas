import { prisma } from "@/src/lib/prisma";

export class PromoCodeRepository {

  async findAll() {

    return prisma.promoCode.findMany({

      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async create(data: {
    code: string;
    description: string | null;
    discountPercent: number;
    usageLimit: number | null;
    startsAt: Date | null;
    endsAt: Date | null;
  }) {

    return prisma.promoCode.create({ data });
  }

  async toggleActive(id: string, active: boolean) {

    return prisma.promoCode.update({ where: { id }, data: { active } });
  }
}
