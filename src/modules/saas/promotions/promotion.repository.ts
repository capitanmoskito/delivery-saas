import { prisma } from "@/src/lib/prisma";

export class PromotionRepository {

  async findAll() {

    return prisma.saaSPromotion.findMany({

      orderBy: {
        createdAt: "desc"
      }
    });
  }
}