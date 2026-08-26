import bcrypt from "bcrypt";

import { AuthRepository }
  from "./auth.repository";

import { LoginDto }
  from "./auth.types";

import { AUTH_ERRORS }
  from "./auth.constants";

export class AuthService {

  private repository =
    new AuthRepository();

  async login(
    payload: LoginDto
  ) {

    const user =
      await this.repository
        .findUserByEmail(
          payload.email
        );

    if (!user) {

      throw new Error(
        AUTH_ERRORS.USER_NOT_FOUND
      );
    }

    const validPassword =
      await bcrypt.compare(
        payload.password,
        user.passwordHash
      );

    if (!validPassword) {

      throw new Error(
        AUTH_ERRORS.INVALID_CREDENTIALS
      );
    }

    return {

      id: user.id,

      email: user.email,

      role: user.role,

      tenantId: user.tenantId
    };
  }
}