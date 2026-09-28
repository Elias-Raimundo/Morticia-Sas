-- AlterTable
ALTER TABLE "User" ADD COLUMN "hasAccess" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "legalName" TEXT;
ALTER TABLE "User" ADD COLUMN "contactEmail" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "isCounterSale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT;

-- CreateIndex
CREATE INDEX "Order_isCounterSale_idx" ON "Order"("isCounterSale");
