import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type PaymentCredentials = {
  mercadoPagoAccessToken?: string;
  mercadoPagoWebhookSecret?: string;
  clipApiKey?: string;
  clipApiSecret?: string;
};

function getEncryptionKey() {
  const configuredKey = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!configuredKey || !/^[0-9a-fA-F]{64}$/.test(configuredKey)) {
    throw new Error("PAYMENT_CREDENTIALS_ENCRYPTION_KEY debe contener 64 caracteres hexadecimales.");
  }
  return Buffer.from(configuredKey, "hex");
}

export function encryptPaymentCredentials(credentials: PaymentCredentials) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), initializationVector);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  return ["v1", initializationVector.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptPaymentCredentials(encryptedCredentials: string): PaymentCredentials {
  const [version, initializationVector, authenticationTag, payload] = encryptedCredentials.split(".");
  if (version !== "v1" || !initializationVector || !authenticationTag || !payload) {
    throw new Error("Formato de credenciales de pago no válido.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(initializationVector, "base64"));
  decipher.setAuthTag(Buffer.from(authenticationTag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload, "base64")), decipher.final()]).toString("utf8");
  const parsed: unknown = JSON.parse(decrypted);
  if (!parsed || typeof parsed !== "object") throw new Error("Credenciales de pago no válidas.");

  const data = parsed as Record<string, unknown>;
  return {
    mercadoPagoAccessToken: typeof data.mercadoPagoAccessToken === "string" ? data.mercadoPagoAccessToken : undefined,
    mercadoPagoWebhookSecret: typeof data.mercadoPagoWebhookSecret === "string" ? data.mercadoPagoWebhookSecret : undefined,
    clipApiKey: typeof data.clipApiKey === "string" ? data.clipApiKey : undefined,
    clipApiSecret: typeof data.clipApiSecret === "string" ? data.clipApiSecret : undefined,
  };
}
