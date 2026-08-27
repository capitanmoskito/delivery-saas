import { prisma } from "@/src/lib/prisma";

export class PlanRepository {

  async findAll() {
    return prisma.subscriptionPlan.findMany({
      orderBy: {
        name: "asc"
      }
    });
  }

  async findById(id: string) {
    return prisma.subscriptionPlan.findUnique({
      where: { id }
    });
  }

  async create(data: {
    name: string;
    description?: string;
    price: number;
  }) {
    return prisma.subscriptionPlan.create({
      data
    });
  }

  async update(
    id: string,
    data: {
      name: string;
      description?: string;
      price: number;
      active: boolean;
    }
  ) {
    return prisma.subscriptionPlan.update({
      where: { id },
      data
    });
  }
}