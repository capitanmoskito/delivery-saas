-- AlterTable
ALTER TABLE "orders" ADD COLUMN "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "deliveryDistanceKm" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "business_delivery_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "feeType" TEXT NOT NULL DEFAULT 'fixed',
    "fixedFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perKmFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDistanceKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_delivery_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_delivery_settings_tenantId_key" ON "business_delivery_settings"("tenantId");
