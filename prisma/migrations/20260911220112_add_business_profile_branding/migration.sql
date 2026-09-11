-- AlterTable
ALTER TABLE "public"."business_profiles" ADD COLUMN     "galleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
