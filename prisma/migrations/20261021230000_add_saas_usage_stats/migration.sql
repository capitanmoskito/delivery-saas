ALTER TABLE "users" ADD COLUMN "gender" TEXT;
ALTER TABLE "customer_addresses" ADD COLUMN "municipality" TEXT;
ALTER TABLE "business_profiles" ADD COLUMN "municipality" TEXT;

CREATE TABLE "user_activity_days" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "user_activity_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_activity_days_userId_day_key" ON "user_activity_days"("userId", "day");
CREATE INDEX "user_activity_days_day_idx" ON "user_activity_days"("day");

ALTER TABLE "user_activity_days" ADD CONSTRAINT "user_activity_days_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
