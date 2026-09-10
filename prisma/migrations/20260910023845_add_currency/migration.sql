-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('MXN', 'USD', 'EUR', 'GBP', 'CAD', 'ARS', 'COP', 'CLP', 'PEN', 'BRL');

-- AlterTable
ALTER TABLE "public"."restaurants" ADD COLUMN     "currency" "public"."Currency" NOT NULL DEFAULT 'MXN';
