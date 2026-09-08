import { prisma } from "@/src/lib/prisma";

export class AuthRepository {

  async findUserByEmail(
    email: string
  ) {

    console.log(
      "Buscando usuario:",
      email
    );

    const user =
      await prisma.user.findUnique({
        where: {
          email
        }
      });

    console.log(
      "Usuario encontrado:",
      user
    );

    return user;
  }
}