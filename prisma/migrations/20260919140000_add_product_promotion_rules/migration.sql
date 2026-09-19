CREATE TYPE "BusinessPromotionDiscountType" AS ENUM ('percentage', 'fixed_amount');

ALTER TABLE "business_promotions"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "discountType" "BusinessPromotionDiscountType";

CREATE TABLE "promotion_target_products" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "promotion_target_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotion_required_products" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "promotion_required_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotion_free_products" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "promotion_free_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotion_target_products_promotionId_productId_key" ON "promotion_target_products"("promotionId", "productId");
CREATE INDEX "promotion_target_products_productId_idx" ON "promotion_target_products"("productId");
CREATE UNIQUE INDEX "promotion_required_products_promotionId_productId_key" ON "promotion_required_products"("promotionId", "productId");
CREATE INDEX "promotion_required_products_productId_idx" ON "promotion_required_products"("productId");
CREATE UNIQUE INDEX "promotion_free_products_promotionId_productId_key" ON "promotion_free_products"("promotionId", "productId");
CREATE INDEX "promotion_free_products_productId_idx" ON "promotion_free_products"("productId");

ALTER TABLE "promotion_target_products" ADD CONSTRAINT "promotion_target_products_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "business_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_target_products" ADD CONSTRAINT "promotion_target_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_required_products" ADD CONSTRAINT "promotion_required_products_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "business_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_required_products" ADD CONSTRAINT "promotion_required_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_free_products" ADD CONSTRAINT "promotion_free_products_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "business_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_free_products" ADD CONSTRAINT "promotion_free_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;