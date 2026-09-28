-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "category" TEXT;
ALTER TABLE "Asset" ADD COLUMN "installmentsCount" INTEGER;

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");
