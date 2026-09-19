ALTER TABLE "orders"
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "neighborhood" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "deliveryReference" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;