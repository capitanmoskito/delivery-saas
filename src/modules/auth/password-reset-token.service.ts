import { createHash, randomBytes } from "crypto";

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: createHash("sha256")
      .update(token)
      .digest("hex")
  };
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}