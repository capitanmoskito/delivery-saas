ALTER TABLE "business_promotions"
ADD COLUMN "appliesToTakeawayDelivery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "appliesToLocalOrders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "appliesToCash" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "appliesToCard" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "orders"
ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'cash',
ADD COLUMN "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "appliedPromotions" JSONB;