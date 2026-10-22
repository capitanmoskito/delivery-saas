ALTER TABLE "saas_settings" ADD COLUMN "subscriptionMonthlyPrice" DOUBLE PRECISION;

CREATE TABLE "platform_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_reviews_userId_key" ON "platform_reviews"("userId");
CREATE INDEX "platform_reviews_createdAt_idx" ON "platform_reviews"("createdAt");
