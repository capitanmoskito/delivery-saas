-- DropIndex
DROP INDEX "public"."orders_orderNumber_key";

-- CreateTable
CREATE TABLE "public"."store_reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "customerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_reviews_tenantId_createdAt_idx" ON "public"."store_reviews"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."store_reviews" ADD CONSTRAINT "store_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
