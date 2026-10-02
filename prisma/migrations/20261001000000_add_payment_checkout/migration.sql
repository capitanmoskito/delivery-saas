-- Add payment checkout references to orders.
ALTER TABLE "public"."orders"
ADD COLUMN "paymentProvider" TEXT,
ADD COLUMN "externalPaymentId" TEXT,
ADD COLUMN "discountCode" TEXT;

CREATE INDEX "orders_paymentProvider_externalPaymentId_idx"
ON "public"."orders"("paymentProvider", "externalPaymentId");

-- Store provider credentials separately per tenant; application encrypts credentials before persistence.
CREATE TABLE "public"."payment_provider_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "credentialsEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_provider_configs_tenantId_provider_key"
ON "public"."payment_provider_configs"("tenantId", "provider");

CREATE TABLE "public"."business_transfer_details" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "accountNumber" TEXT,
    "clabe" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_transfer_details_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_transfer_details_tenantId_key"
ON "public"."business_transfer_details"("tenantId");
