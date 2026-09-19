-- AlterTable
ALTER TABLE "public"."business_schedules" ADD COLUMN     "businessProfileId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."business_schedules" ADD CONSTRAINT "business_schedules_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "public"."business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
