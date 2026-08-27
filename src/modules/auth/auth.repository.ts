import { prisma } from "@/src/lib/prisma";

export class AuthRepository {

  async findUserByEmail(
    email: string
  ) {

    return prisma.user.findUnique({
      where: {
        email
      }
    });
  }
}
