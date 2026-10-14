CREATE TABLE "delivery_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "activeCode" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_codes_orderId_key" ON "delivery_codes"("orderId");
CREATE UNIQUE INDEX "delivery_codes_activeCode_key" ON "delivery_codes"("activeCode");
CREATE INDEX "delivery_codes_tenantId_idx" ON "delivery_codes"("tenantId");

ALTER TABLE "delivery_codes" ADD CONSTRAINT "delivery_codes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
