export interface SessionUser {
  id: string;
  email: string;
  role: string;
  tenantId?: string | null;
}

export class SessionService {

  static createSession(
    user: SessionUser
  ) {

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };
  }
}