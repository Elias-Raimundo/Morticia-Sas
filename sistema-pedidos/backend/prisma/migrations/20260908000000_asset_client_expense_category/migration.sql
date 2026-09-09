-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "clientId" INTEGER;

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE INDEX "Asset_clientId_idx" ON "Asset"("clientId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
