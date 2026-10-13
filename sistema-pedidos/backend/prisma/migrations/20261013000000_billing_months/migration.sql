-- CreateTable
CREATE TABLE "BillingMonth" (
    "id" SERIAL NOT NULL,
    "period" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "BillingMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingMonth_period_key" ON "BillingMonth"("period");
