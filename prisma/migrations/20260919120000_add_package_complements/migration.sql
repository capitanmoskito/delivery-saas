CREATE TABLE "package_complements" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "package_complements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "package_complements_packageId_idx" ON "package_complements"("packageId");

ALTER TABLE "package_complements"
ADD CONSTRAINT "package_complements_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "packages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;