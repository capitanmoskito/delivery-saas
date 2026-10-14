ALTER TABLE "orders" ADD COLUMN "deliveredToName" TEXT,
ADD COLUMN "deliveryConfirmation" TEXT,
ADD COLUMN "deliveryConfirmedAt" TIMESTAMP(3);
