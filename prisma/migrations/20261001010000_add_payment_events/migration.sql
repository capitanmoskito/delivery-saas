CREATE TABLE "public"."payment_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "provider" TEXT,
    "eventType" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "externalPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_events_tenantId_orderId_createdAt_idx"
ON "public"."payment_events"("tenantId", "orderId", "createdAt");
