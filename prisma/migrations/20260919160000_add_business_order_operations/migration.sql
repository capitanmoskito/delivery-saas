ALTER TABLE "orders"
ADD COLUMN "orderNumber" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'online',
ADD COLUMN "fulfillmentType" TEXT NOT NULL DEFAULT 'delivery',
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "customerName" TEXT,
ADD COLUMN "tableNumber" TEXT,
ADD COLUMN "deliveryAddress" TEXT;

ALTER TABLE "order_items" ADD COLUMN "additions" JSONB;

CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

CREATE TABLE "business_day_closures" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "onlineOrderCount" INTEGER NOT NULL,
    "localOrderCount" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_day_closures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "business_day_closures_tenantId_endsAt_idx" ON "business_day_closures"("tenantId", "endsAt");