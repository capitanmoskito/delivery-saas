-- CreateTable
CREATE TABLE "public"."tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "currentPeriodEnd" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscription_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'clip',
    "externalPaymentId" TEXT,
    "checkoutUrl" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sales_hourly_stats" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "orders" INTEGER NOT NULL,
    "units" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_hourly_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_tenantId_key" ON "public"."tenant_subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscription_payments_tenantId_createdAt_idx" ON "public"."subscription_payments"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "subscription_payments_provider_externalPaymentId_idx" ON "public"."subscription_payments"("provider", "externalPaymentId");

-- CreateIndex
CREATE INDEX "sales_hourly_stats_tenantId_year_month_idx" ON "public"."sales_hourly_stats"("tenantId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "sales_hourly_stats_tenantId_date_hour_source_key" ON "public"."sales_hourly_stats"("tenantId", "date", "hour", "source");

-- AddForeignKey
ALTER TABLE "public"."tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

